import { describe, expect, it, vi } from 'vitest'

import {
  createGitVcsProvider,
  getGitFileDiff,
  parseGitShortStat,
  parseGitStatusPorcelain
} from '../src/index'

describe('parseGitShortStat', () => {
  it('parses the git shortstat output into normalized stats', () => {
    expect(parseGitShortStat(' 3 files changed, 12 insertions(+), 4 deletions(-)\n')).toEqual({
      filesChanged: 3,
      insertions: 12,
      deletions: 4
    })
  })

  it('returns zero stats for empty output', () => {
    expect(parseGitShortStat('')).toEqual({
      filesChanged: 0,
      insertions: 0,
      deletions: 0
    })
  })
})

describe('parseGitStatusPorcelain', () => {
  it('parses tracked, untracked, and renamed files', () => {
    expect(parseGitStatusPorcelain(' M src/app.ts\n?? notes/todo.md\nR  old.ts -> new.ts\n')).toEqual([
      { path: 'src/app.ts', status: 'M' },
      { path: 'notes/todo.md', status: '??' },
      { path: 'new.ts', status: 'R', oldPath: 'old.ts' }
    ])
  })
})

describe('createGitVcsProvider', () => {
  it('reports inactive when the folder is not a git repository', async () => {
    const run = vi.fn(async () => {
      throw new Error('not a repo')
    })
    const provider = createGitVcsProvider(run)

    await expect(provider.getStatus('/tmp/project')).resolves.toEqual({ active: false })
  })

  it('reports normalized stats for active git repositories', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ stdout: 'true\n', stderr: '' })
      .mockResolvedValueOnce({
        stdout: ' 2 files changed, 8 insertions(+), 3 deletions(-)\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        stdout: ' M src/app.ts\n?? notes/todo.md\n',
        stderr: ''
      })
    const provider = createGitVcsProvider(run)

    await expect(provider.getStatus('/tmp/project')).resolves.toEqual({
      active: true,
      stats: {
        filesChanged: 2,
        insertions: 8,
        deletions: 3
      },
      files: [
        { path: 'src/app.ts', status: 'M' },
        { path: 'notes/todo.md', status: '??' }
      ]
    })
  })

  it('returns a tracked file diff by combining staged and unstaged changes', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ stdout: 'cached diff', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'working diff', stderr: '' })

    await expect(
      getGitFileDiff('/tmp/project', { path: 'src/app.ts', status: 'M' }, run)
    ).resolves.toBe('cached diff\n\nworking diff\n')
  })

  it('returns an untracked file diff using no-index mode', async () => {
    const run = vi.fn(async () => {
      const error = new Error('diff found') as Error & { stdout: string; code: number }
      error.stdout = 'diff --git a/notes/todo.md b/notes/todo.md\n'
      error.code = 1
      throw error
    })

    await expect(
      getGitFileDiff('/tmp/project', { path: 'notes/todo.md', status: '??' }, run)
    ).resolves.toBe('diff --git a/notes/todo.md b/notes/todo.md\n')
  })
})
