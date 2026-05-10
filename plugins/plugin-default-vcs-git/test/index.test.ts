import { describe, expect, it, vi } from 'vitest';

import {
  createGitVcsProvider,
  commitGitChanges,
  createGitBranch,
  getGitFileDiff,
  listGitBranches,
  parseGhPullRequest,
  parseGitBranchLine,
  parseGitShortStat,
  parseGitStatusPorcelain,
  stageGitFiles
} from '../src/index';

describe('parseGitShortStat', () => {
  it('parses the git shortstat output into normalized stats', () => {
    expect(parseGitShortStat(' 3 files changed, 12 insertions(+), 4 deletions(-)\n')).toEqual({
      filesChanged: 3,
      insertions: 12,
      deletions: 4
    });
  });

  it('returns zero stats for empty output', () => {
    expect(parseGitShortStat('')).toEqual({
      filesChanged: 0,
      insertions: 0,
      deletions: 0
    });
  });
});

describe('parseGitStatusPorcelain', () => {
  it('parses tracked, untracked, and renamed files', () => {
    expect(
      parseGitStatusPorcelain(' M src/app.ts\n?? notes/todo.md\nR  old.ts -> new.ts\n')
    ).toEqual([
      { path: 'src/app.ts', status: 'M', unstagedStatus: 'M' },
      { path: 'notes/todo.md', status: '??', unstagedStatus: '??' },
      { path: 'new.ts', status: 'R', stagedStatus: 'R', oldPath: 'old.ts' }
    ]);
  });

  it('preserves staged and unstaged status columns', () => {
    expect(
      parseGitStatusPorcelain('M  staged.ts\nMM both.ts\nA  added.ts\n D deleted.ts\n')
    ).toEqual([
      { path: 'staged.ts', status: 'M', stagedStatus: 'M' },
      { path: 'both.ts', status: 'MM', stagedStatus: 'M', unstagedStatus: 'M' },
      { path: 'added.ts', status: 'A', stagedStatus: 'A' },
      { path: 'deleted.ts', status: 'D', unstagedStatus: 'D' }
    ]);
  });
});

describe('parseGitBranchLine', () => {
  it('parses upstream, ahead, and behind from a branch tracking line', () => {
    expect(parseGitBranchLine('## feature/vcs...origin/feature/vcs [ahead 3, behind 1]')).toEqual({
      upstream: 'origin/feature/vcs',
      ahead: 3,
      behind: 1
    });
  });

  it('parses ahead-only tracking info', () => {
    expect(parseGitBranchLine('## main...origin/main [ahead 2]')).toEqual({
      upstream: 'origin/main',
      ahead: 2,
      behind: 0
    });
  });

  it('parses a branch with no ahead/behind info', () => {
    expect(parseGitBranchLine('## main...origin/main')).toEqual({
      upstream: 'origin/main',
      ahead: 0,
      behind: 0
    });
  });

  it('returns empty object for non-branch lines', () => {
    expect(parseGitBranchLine('## HEAD (no branch)')).toEqual({});
    expect(parseGitBranchLine(' M src/app.ts')).toEqual({});
  });
});

describe('parseGhPullRequest', () => {
  it('parses GitHub CLI pull request JSON', () => {
    expect(
      parseGhPullRequest(
        '{"number":42,"title":"Add branch metadata","url":"https://github.com/acme/app/pull/42","headRefName":"feature/vcs"}'
      )
    ).toEqual({
      number: 42,
      title: 'Add branch metadata',
      url: 'https://github.com/acme/app/pull/42',
      headRefName: 'feature/vcs'
    });
  });

  it('parses open PR state', () => {
    expect(
      parseGhPullRequest('{"number":1,"title":"Fix","state":"OPEN","isDraft":false}')
    ).toMatchObject({ state: 'open' });
  });

  it('parses draft PR state', () => {
    expect(
      parseGhPullRequest('{"number":1,"title":"Fix","state":"OPEN","isDraft":true}')
    ).toMatchObject({ state: 'draft' });
  });

  it('parses merged PR state', () => {
    expect(parseGhPullRequest('{"number":1,"title":"Fix","state":"MERGED"}')).toMatchObject({
      state: 'merged'
    });
  });

  it('derives passing checks from statusCheckRollup', () => {
    expect(
      parseGhPullRequest(
        '{"number":1,"title":"Fix","statusCheckRollup":[{"state":"SUCCESS"},{"state":"SUCCESS"}]}'
      )
    ).toMatchObject({ checks: 'passing' });
  });

  it('derives failing checks from statusCheckRollup', () => {
    expect(
      parseGhPullRequest(
        '{"number":1,"title":"Fix","statusCheckRollup":[{"state":"SUCCESS"},{"state":"FAILURE"}]}'
      )
    ).toMatchObject({ checks: 'failing' });
  });

  it('parses reviewer count from reviewRequests', () => {
    expect(
      parseGhPullRequest(
        '{"number":1,"title":"Fix","reviewRequests":[{"login":"alice"},{"login":"bob"}]}'
      )
    ).toMatchObject({ reviewers: 2 });
  });

  it('returns null for invalid pull request JSON', () => {
    expect(parseGhPullRequest('not json')).toBeNull();
  });
});

describe('createGitVcsProvider', () => {
  it('reports inactive when the folder is not a git repository', async () => {
    const run = vi.fn(async () => {
      throw new Error('not a repo');
    });
    const provider = createGitVcsProvider(run);

    await expect(provider.getStatus('/tmp/project')).resolves.toEqual({ active: false });
  });

  it('reports normalized stats for active git repositories', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ stdout: 'true\n', stderr: '' }) // isGitRepository
      .mockResolvedValueOnce({ stdout: '\n', stderr: '' }) // getGitBranchName (no branch)
      .mockResolvedValueOnce({
        stdout: ' 2 files changed, 8 insertions(+), 3 deletions(-)\n',
        stderr: ''
      }) // diff --shortstat
      .mockResolvedValueOnce({
        stdout: '## main\n M src/app.ts\n?? notes/todo.md\n',
        stderr: ''
      }); // status -b --porcelain=v1
    const provider = createGitVcsProvider(run);

    await expect(provider.getStatus('/tmp/project')).resolves.toEqual({
      active: true,
      stats: {
        filesChanged: 2,
        insertions: 8,
        deletions: 3
      },
      files: [
        { path: 'src/app.ts', status: 'M', unstagedStatus: 'M' },
        { path: 'notes/todo.md', status: '??', unstagedStatus: '??' }
      ]
    });
  });

  it('reports the current branch and associated pull request when available', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ stdout: 'true\n', stderr: '' }) // isGitRepository
      .mockResolvedValueOnce({ stdout: 'feature/vcs\n', stderr: '' }) // getGitBranchName
      .mockResolvedValueOnce({
        stdout: ' 1 file changed, 4 insertions(+)\n',
        stderr: ''
      }) // diff --shortstat
      .mockResolvedValueOnce({
        stdout: '## feature/vcs...origin/feature/vcs [ahead 3, behind 1]\n M src/app.ts\n',
        stderr: ''
      }) // status -b --porcelain=v1
      .mockResolvedValueOnce({
        stdout:
          '{"number":42,"title":"Add branch metadata","url":"https://github.com/acme/app/pull/42","headRefName":"feature/vcs","state":"OPEN","isDraft":false}',
        stderr: ''
      }); // gh pr view
    const provider = createGitVcsProvider(run);

    await expect(provider.getStatus('/tmp/project')).resolves.toEqual({
      active: true,
      stats: {
        filesChanged: 1,
        insertions: 4,
        deletions: 0
      },
      files: [{ path: 'src/app.ts', status: 'M', unstagedStatus: 'M' }],
      repository: {
        branch: 'feature/vcs',
        pullRequest: {
          number: 42,
          title: 'Add branch metadata',
          url: 'https://github.com/acme/app/pull/42',
          headRefName: 'feature/vcs',
          state: 'open'
        },
        upstream: 'origin/feature/vcs',
        ahead: 3,
        behind: 1
      }
    });
  });

  it('reuses cached pull request metadata during repeated status reads', async () => {
    let currentTime = 1_000;
    const run = vi.fn(async (file: string, args: string[]) => {
      if (file === 'gh') {
        return {
          stdout: '{"number":42,"title":"Add branch metadata","state":"OPEN","isDraft":false}',
          stderr: ''
        };
      }

      if (args[0] === 'rev-parse') {
        return { stdout: 'true\n', stderr: '' };
      }

      if (args[0] === 'branch') {
        return { stdout: 'feature/vcs\n', stderr: '' };
      }

      if (args[0] === 'diff') {
        return { stdout: ' 1 file changed, 4 insertions(+)\n', stderr: '' };
      }

      if (args[0] === 'status') {
        return {
          stdout: '## feature/vcs...origin/feature/vcs\n M src/app.ts\n',
          stderr: ''
        };
      }

      throw new Error(`Unexpected command: ${file} ${args.join(' ')}`);
    });
    const provider = createGitVcsProvider(run, () => currentTime);

    await provider.getStatus('/tmp/project');
    currentTime += 30_000;
    await provider.getStatus('/tmp/project');

    expect(run.mock.calls.filter(([file]) => file === 'gh')).toHaveLength(1);
  });

  it('returns a tracked file diff by combining staged and unstaged changes', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ stdout: 'cached diff', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'working diff', stderr: '' });

    await expect(
      getGitFileDiff('/tmp/project', { path: 'src/app.ts', status: 'M' }, run)
    ).resolves.toBe('cached diff\n\nworking diff\n');
  });

  it('returns an untracked file diff using no-index mode', async () => {
    const run = vi.fn(async () => {
      const error = new Error('diff found') as Error & { stdout: string; code: number };
      error.stdout = 'diff --git a/notes/todo.md b/notes/todo.md\n';
      error.code = 1;
      throw error;
    });

    await expect(
      getGitFileDiff('/tmp/project', { path: 'notes/todo.md', status: '??' }, run)
    ).resolves.toBe('diff --git a/notes/todo.md b/notes/todo.md\n');
  });

  it('stages file paths through git add', async () => {
    const run = vi.fn(async () => ({ stdout: '', stderr: '' }));

    await stageGitFiles(
      '/tmp/project',
      [
        { path: 'src/app.ts', status: 'M', unstagedStatus: 'M' },
        { path: 'new.ts', status: 'R', oldPath: 'old.ts', unstagedStatus: 'R' }
      ],
      run
    );

    expect(run).toHaveBeenCalledWith('git', ['add', '--', 'src/app.ts', 'old.ts', 'new.ts'], {
      cwd: '/tmp/project'
    });
  });

  it('commits staged changes with a trimmed message', async () => {
    const run = vi.fn(async () => ({ stdout: '', stderr: '' }));

    await commitGitChanges('/tmp/project', '  Add VCS sidebar commits  ', run);

    expect(run).toHaveBeenCalledWith('git', ['commit', '-m', 'Add VCS sidebar commits'], {
      cwd: '/tmp/project'
    });
  });

  it('creates and checks out a trimmed branch name', async () => {
    const run = vi.fn(async () => ({ stdout: '', stderr: '' }));

    await createGitBranch('/tmp/project', '  feature/sidebar-menu  ', run);

    expect(run).toHaveBeenNthCalledWith(
      1,
      'git',
      ['check-ref-format', '--branch', 'feature/sidebar-menu'],
      { cwd: '/tmp/project' }
    );
    expect(run).toHaveBeenNthCalledWith(2, 'git', ['checkout', '-b', 'feature/sidebar-menu'], {
      cwd: '/tmp/project'
    });
  });

  it('rejects invalid branch names before checkout', async () => {
    const run = vi.fn(async () => {
      throw new Error('invalid ref');
    });

    await expect(createGitBranch('/tmp/project', 'bad..branch', run)).rejects.toThrow(
      'Invalid branch name.'
    );
    expect(run).toHaveBeenCalledWith('git', ['check-ref-format', '--branch', 'bad..branch'], {
      cwd: '/tmp/project'
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('lists branches ordered by latest commit date', async () => {
    const run = vi.fn(async () => ({
      stdout: 'feature/recent\nmain\nfeature/old\n',
      stderr: ''
    }));

    await expect(listGitBranches('/tmp/project', run)).resolves.toEqual([
      'feature/recent',
      'main',
      'feature/old'
    ]);
    expect(run).toHaveBeenCalledWith(
      'git',
      ['branch', '--sort=-committerdate', '--format=%(refname:short)'],
      { cwd: '/tmp/project' }
    );
  });
});
