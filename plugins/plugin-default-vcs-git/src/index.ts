import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import type { AppPlugin, MainPluginContext, VcsProviderDefinition, VcsStats } from '@sessionry/plugin-api'

type ExecFileResult = {
  stdout: string | Buffer
  stderr: string | Buffer
}

type ExecFileLike = (
  file: string,
  args: string[],
  options: { cwd: string }
) => Promise<ExecFileResult>

const execFileAsync = promisify(execFile) as ExecFileLike

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
      const result = await run('git', ['diff', '--shortstat', '--', '.'], { cwd: folder })
      return {
        active: true,
        stats: parseGitShortStat(String(result.stdout))
      }
    } catch {
      return { active: false }
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
