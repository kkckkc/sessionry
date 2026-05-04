import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import type { AppPlugin, MainPluginContext, VcsProviderDefinition, VcsStats, VcsFileStatus } from '@sessionry/plugin-api'

type ExecFileResult = {
  stdout: string | Buffer
  stderr: string | Buffer
}

type ExecFileError = Error & {
  stdout?: string | Buffer
  stderr?: string | Buffer
  code?: number | null
}

type ExecFileLike = (
  file: string,
  args: string[],
  options: { cwd: string }
) => Promise<ExecFileResult>

const execFileAsync = promisify(execFile) as ExecFileLike

const getExecErrorStdout = (error: unknown): string => {
  const stdout = (error as ExecFileError | undefined)?.stdout
  return typeof stdout === 'string' ? stdout : String(stdout ?? '')
}

export const parseGitShortStat = (stdout: string): VcsStats => {
  const output = stdout.trim()
  if (output.length === 0) {
    return { filesChanged: 0, insertions: 0, deletions: 0 }
  }

  return {
    filesChanged: Number(output.match(/(\d+)\s+files?\s+changed/)?.[1] ?? 0),
    insertions: Number(output.match(/(\d+)\s+insertions?\(\+\)/)?.[1] ?? 0),
    deletions: Number(output.match(/(\d+)\s+deletions?\(-\)/)?.[1] ?? 0)
  }
}

export const parseGitStatusPorcelain = (stdout: string): VcsFileStatus[] => {
  const output = stdout.trimEnd()
  if (output.length === 0) {
    return []
  }

  const lines = output.split('\n')
  return lines.map((line) => {
    const status = line.substring(0, 2)
    const path = line.substring(3)

    // Handle renames: "R  old -> new"
    if (status.startsWith('R')) {
      const parts = path.split(' -> ')
      if (parts.length === 2) {
        return { path: parts[1]!, status: status.trim(), oldPath: parts[0] }
      }
    }

    return { path, status: status.trim() || '??' }
  })
}

const runDiffCommand = async (
  run: ExecFileLike,
  folder: string,
  args: string[]
): Promise<string> => {
  try {
    const result = await run('git', args, { cwd: folder })
    return String(result.stdout)
  } catch (error) {
    const execError = error as ExecFileError
    if (args.includes('--no-index') && execError.code === 1) {
      return getExecErrorStdout(execError)
    }

    throw error
  }
}

export const getGitFileDiff = async (
  folder: string,
  file: VcsFileStatus,
  run: ExecFileLike
): Promise<string | null> => {
  const targets = file.oldPath ? [file.oldPath, file.path] : [file.path]

  if (file.status === '??') {
    const diff = await runDiffCommand(run, folder, ['diff', '--no-index', '--', '/dev/null', file.path])
    return diff.length > 0 ? diff : null
  }

  const [stagedDiff, unstagedDiff] = await Promise.all([
    runDiffCommand(run, folder, ['diff', '--cached', '--', ...targets]),
    runDiffCommand(run, folder, ['diff', '--', ...targets])
  ])

  const diff = [stagedDiff.trimEnd(), unstagedDiff.trimEnd()].filter((value) => value.length > 0).join('\n\n')
  return diff.length > 0 ? `${diff}\n` : null
}

const isGitRepository = async (folder: string, run: ExecFileLike): Promise<boolean> => {
  try {
    const result = await run('git', ['rev-parse', '--is-inside-work-tree'], { cwd: folder })
    return String(result.stdout).trim() === 'true'
  } catch {
    return false
  }
}

export const createGitVcsProvider = (run: ExecFileLike = execFileAsync): VcsProviderDefinition => ({
  id: 'git',
  name: 'Git',
  priority: 100,
  async getStatus(folder) {
    const active = await isGitRepository(folder, run)
    if (!active) {
      return { active: false }
    }

    try {
      const [statsResult, statusResult] = await Promise.all([
        run('git', ['diff', '--shortstat'], { cwd: folder }),
        run('git', ['status', '--porcelain=v1'], { cwd: folder })
      ])
      
      return {
        active: true,
        stats: parseGitShortStat(String(statsResult.stdout)),
        files: parseGitStatusPorcelain(String(statusResult.stdout))
      }
    } catch {
      return { active: false }
    }
  },
  async getDiff(folder, file) {
    const active = await isGitRepository(folder, run)
    if (!active) {
      return null
    }

    try {
      return await getGitFileDiff(folder, file, run)
    } catch {
      return null
    }
  }
})

const activateMain = (context: MainPluginContext): void => {
  context.vcs.registerProvider(createGitVcsProvider())
}

export const gitVcsPlugin: AppPlugin = {
  id: 'plugin-default-vcs-git',
  name: 'Git VCS',
  activateMain
}

export default gitVcsPlugin
