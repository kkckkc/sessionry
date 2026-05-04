import { describe, expect, it, vi } from 'vitest'

import { createGitVcsProvider, parseGitShortStat } from '../src/index'

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
    const provider = createGitVcsProvider(run)

    await expect(provider.getStatus('/tmp/project')).resolves.toEqual({
      active: true,
      stats: {
        filesChanged: 2,
        insertions: 8,
        deletions: 3
      }
    })
  })
})
