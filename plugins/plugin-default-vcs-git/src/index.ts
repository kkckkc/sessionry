import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  AppPlugin,
  MainPluginContext,
  VcsPullRequest,
  VcsProviderDefinition,
  VcsStats,
  VcsFileStatus
} from '@sessionry/plugin-api';

type ExecFileResult = {
  stdout: string | Buffer;
  stderr: string | Buffer;
};

type ExecFileError = Error & {
  stdout?: string | Buffer;
  stderr?: string | Buffer;
  code?: number | null;
};

type ExecFileLike = (
  file: string,
  args: string[],
  options: { cwd: string; timeout?: number }
) => Promise<ExecFileResult>;

interface CachedPullRequest {
  expiresAt: number;
  value: VcsPullRequest | null;
}

const execFileAsync = promisify(execFile) as ExecFileLike;
const PULL_REQUEST_CACHE_TTL_MS = 60_000;

const getExecErrorStdout = (error: unknown): string => {
  const stdout = (error as ExecFileError | undefined)?.stdout;
  return typeof stdout === 'string' ? stdout : String(stdout ?? '');
};

export const parseGitShortStat = (stdout: string): VcsStats => {
  const output = stdout.trim();
  if (output.length === 0) {
    return { filesChanged: 0, insertions: 0, deletions: 0 };
  }

  return {
    filesChanged: Number(output.match(/(\d+)\s+files?\s+changed/)?.[1] ?? 0),
    insertions: Number(output.match(/(\d+)\s+insertions?\(\+\)/)?.[1] ?? 0),
    deletions: Number(output.match(/(\d+)\s+deletions?\(-\)/)?.[1] ?? 0)
  };
};

export const parseGitStatusPorcelain = (stdout: string): VcsFileStatus[] => {
  const output = stdout.trimEnd();
  if (output.length === 0) {
    return [];
  }

  const lines = output.split('\n');
  return lines.map(line => {
    const rawStatus = line.substring(0, 2);
    const indexStatus = rawStatus[0];
    const workTreeStatus = rawStatus[1];
    const path = line.substring(3);
    const stagedStatus =
      indexStatus && indexStatus !== ' ' && indexStatus !== '?' ? indexStatus : undefined;
    const unstagedStatus =
      rawStatus === '??'
        ? '??'
        : workTreeStatus && workTreeStatus !== ' '
          ? workTreeStatus
          : undefined;
    const status =
      rawStatus === '??' ? '??' : `${stagedStatus ?? ''}${unstagedStatus ?? ''}` || rawStatus.trim();

    // Handle renames: "R  old -> new"
    if (rawStatus.startsWith('R') || rawStatus.startsWith('C')) {
      const parts = path.split(' -> ');
      if (parts.length === 2) {
        return {
          path: parts[1]!,
          status,
          ...(stagedStatus ? { stagedStatus } : {}),
          ...(unstagedStatus ? { unstagedStatus } : {}),
          oldPath: parts[0]
        };
      }
    }

    return {
      path,
      status,
      ...(stagedStatus ? { stagedStatus } : {}),
      ...(unstagedStatus ? { unstagedStatus } : {})
    };
  });
};

export const parseGitBranchLine = (
  line: string
): { upstream?: string; ahead?: number; behind?: number } => {
  // Format: ## branch...upstream [ahead X, behind Y]
  const match = line.match(/^## \S+\.\.\.(\S+)(?:\s+\[([^\]]+)\])?/);
  if (!match) return {};

  const upstream = match[1];
  const trackInfo = match[2] ?? '';
  const aheadMatch = trackInfo.match(/ahead (\d+)/);
  const behindMatch = trackInfo.match(/behind (\d+)/);

  return {
    upstream,
    ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
    behind: behindMatch ? Number(behindMatch[1]) : 0
  };
};

export const parseGhPullRequest = (stdout: string): VcsPullRequest | null => {
  try {
    const value = JSON.parse(stdout) as {
      number?: unknown;
      title?: unknown;
      url?: unknown;
      headRefName?: unknown;
      state?: unknown;
      isDraft?: unknown;
      statusCheckRollup?: Array<{ state?: string; conclusion?: string }>;
      reviewRequests?: unknown[];
    };
    if (typeof value.number !== 'number') {
      return null;
    }

    let state: VcsPullRequest['state'];
    if (typeof value.state === 'string') {
      if (value.state === 'MERGED') state = 'merged';
      else if (value.state === 'CLOSED') state = 'closed';
      else if (value.isDraft) state = 'draft';
      else state = 'open';
    }

    let checks: VcsPullRequest['checks'];
    if (Array.isArray(value.statusCheckRollup) && value.statusCheckRollup.length > 0) {
      const states = value.statusCheckRollup.map(c => c?.state ?? c?.conclusion ?? '');
      if (states.some(s => s === 'FAILURE' || s === 'ERROR')) checks = 'failing';
      else if (states.some(s => s === 'PENDING' || s === 'IN_PROGRESS' || s === 'QUEUED'))
        checks = 'pending';
      else if (states.some(s => s === 'SUCCESS')) checks = 'passing';
    }

    const reviewers = Array.isArray(value.reviewRequests) ? value.reviewRequests.length : undefined;

    return {
      number: value.number,
      title: typeof value.title === 'string' ? value.title : `#${value.number}`,
      ...(typeof value.url === 'string' && value.url.length > 0 ? { url: value.url } : {}),
      ...(typeof value.headRefName === 'string' && value.headRefName.length > 0
        ? { headRefName: value.headRefName }
        : {}),
      ...(state !== undefined ? { state } : {}),
      ...(checks !== undefined ? { checks } : {}),
      ...(reviewers !== undefined ? { reviewers } : {})
    };
  } catch {
    return null;
  }
};

const runDiffCommand = async (
  run: ExecFileLike,
  folder: string,
  args: string[]
): Promise<string> => {
  try {
    const result = await run('git', args, { cwd: folder });
    return String(result.stdout);
  } catch (error) {
    const execError = error as ExecFileError;
    if (args.includes('--no-index') && execError.code === 1) {
      return getExecErrorStdout(execError);
    }

    throw error;
  }
};

export const getGitFileDiff = async (
  folder: string,
  file: VcsFileStatus,
  run: ExecFileLike
): Promise<string | null> => {
  const targets = file.oldPath ? [file.oldPath, file.path] : [file.path];

  if (file.status === '??' || file.unstagedStatus === '??') {
    const diff = await runDiffCommand(run, folder, [
      'diff',
      '--no-index',
      '--',
      '/dev/null',
      file.path
    ]);
    return diff.length > 0 ? diff : null;
  }

  const [stagedDiff, unstagedDiff] = await Promise.all([
    runDiffCommand(run, folder, ['diff', '--cached', '--', ...targets]),
    runDiffCommand(run, folder, ['diff', '--', ...targets])
  ]);

  const diff = [stagedDiff.trimEnd(), unstagedDiff.trimEnd()]
    .filter(value => value.length > 0)
    .join('\n\n');
  return diff.length > 0 ? `${diff}\n` : null;
};

const getGitStageTargets = (files: VcsFileStatus[]): string[] => {
  const targets = new Set<string>();
  for (const file of files) {
    if (file.oldPath) {
      targets.add(file.oldPath);
    }
    targets.add(file.path);
  }
  return [...targets];
};

export const stageGitFiles = async (
  folder: string,
  files: VcsFileStatus[],
  run: ExecFileLike
): Promise<void> => {
  const targets = getGitStageTargets(files);
  if (targets.length === 0) {
    return;
  }

  await run('git', ['add', '--', ...targets], { cwd: folder });
};

export const commitGitChanges = async (
  folder: string,
  message: string,
  run: ExecFileLike
): Promise<void> => {
  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    throw new Error('Commit message is required.');
  }

  await run('git', ['commit', '-m', trimmedMessage], { cwd: folder });
};

const getGitBranchName = async (folder: string, run: ExecFileLike): Promise<string | undefined> => {
  try {
    const result = await run('git', ['branch', '--show-current'], { cwd: folder });
    const branch = String(result.stdout).trim();
    return branch.length > 0 ? branch : undefined;
  } catch {
    return undefined;
  }
};

const getGitPullRequest = async (
  folder: string,
  run: ExecFileLike
): Promise<VcsPullRequest | null> => {
  try {
    const result = await run(
      'gh',
      [
        'pr',
        'view',
        '--json',
        'number,title,url,headRefName,state,isDraft,statusCheckRollup,reviewRequests'
      ],
      { cwd: folder, timeout: 5_000 }
    );
    return parseGhPullRequest(String(result.stdout));
  } catch {
    return null;
  }
};

const getGitPullRequestCacheKey = (folder: string, branch: string): string => `${folder}\0${branch}`;

const isGitRepository = async (folder: string, run: ExecFileLike): Promise<boolean> => {
  try {
    const result = await run('git', ['rev-parse', '--is-inside-work-tree'], { cwd: folder });
    return String(result.stdout).trim() === 'true';
  } catch {
    return false;
  }
};

export const createGitVcsProvider = (
  run: ExecFileLike = execFileAsync,
  now: () => number = Date.now
): VcsProviderDefinition => {
  const pullRequestCache = new Map<string, CachedPullRequest>();

  const getCachedPullRequest = async (
    folder: string,
    branch: string
  ): Promise<VcsPullRequest | null> => {
    const key = getGitPullRequestCacheKey(folder, branch);
    const currentTime = now();
    const cached = pullRequestCache.get(key);
    if (cached && cached.expiresAt > currentTime) {
      return cached.value;
    }

    const value = await getGitPullRequest(folder, run);
    pullRequestCache.set(key, {
      expiresAt: currentTime + PULL_REQUEST_CACHE_TTL_MS,
      value
    });
    return value;
  };

  return {
    id: 'git',
    name: 'Git',
    priority: 100,
    async getStatus(folder) {
      try {
        const [active, branch] = await Promise.all([
          isGitRepository(folder, run),
          getGitBranchName(folder, run)
        ]);

        if (!active) {
          return { active: false };
        }

        const [statsResult, statusResult, pullRequest] = await Promise.all([
          run('git', ['diff', '--shortstat'], { cwd: folder }),
          run('git', ['status', '-b', '--porcelain=v1'], { cwd: folder }),
          branch ? getCachedPullRequest(folder, branch) : null
        ]);

        const statusOutput = String(statusResult.stdout);
        const lines = statusOutput.split('\n');
        const branchLine = lines.find(l => l.startsWith('## ')) ?? '';
        const fileLines = lines.filter(l => !l.startsWith('## ')).join('\n');
        const branchMeta = parseGitBranchLine(branchLine);

        return {
          active: true,
          stats: parseGitShortStat(String(statsResult.stdout)),
          files: parseGitStatusPorcelain(fileLines),
          ...(branch
            ? {
                repository: {
                  branch,
                  pullRequest,
                  ...branchMeta
                }
              }
            : {})
        };
      } catch {
        return { active: false };
      }
    },
    async getDiff(folder, file) {
      const active = await isGitRepository(folder, run);
      if (!active) {
        return null;
      }

      try {
        return await getGitFileDiff(folder, file, run);
      } catch {
        return null;
      }
    },
    async stageFiles(folder, files) {
      await stageGitFiles(folder, files, run);
    },
    async commit(folder, message) {
      await commitGitChanges(folder, message, run);
    }
  };
};

const activateMain = (context: MainPluginContext): void => {
  context.vcs.registerProvider(createGitVcsProvider());
};

export const gitVcsPlugin: AppPlugin = {
  id: 'plugin-default-vcs-git',
  name: 'Git VCS',
  activateMain
};

export default gitVcsPlugin;
