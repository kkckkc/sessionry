import { describe, expect, it, vi } from 'vitest'

import { createVcsService } from './vcsService'

describe('createVcsService', () => {
  it('returns the first active provider by priority', async () => {
    const service = createVcsService()
    service.registerProvider({
      id: 'low',
      name: 'Low',
      priority: 1,
      getStatus: vi.fn(async () => ({
        active: true,
        stats: { filesChanged: 1, insertions: 2, deletions: 3 }
      }))
    })
    service.registerProvider({
      id: 'high',
      name: 'High',
      priority: 10,
      getStatus: vi.fn(async () => ({
        active: true,
        stats: { filesChanged: 4, insertions: 5, deletions: 6 }
      }))
    })

    await expect(service.getStatus('/tmp/project')).resolves.toEqual({
      providerId: 'high',
      providerName: 'High',
      stats: { filesChanged: 4, insertions: 5, deletions: 6 }
    })
  })

  it('skips inactive and failing providers', async () => {
    const service = createVcsService()
    service.registerProvider({
      id: 'broken',
      name: 'Broken',
      getStatus: vi.fn(async () => {
        throw new Error('boom')
      })
    })
    service.registerProvider({
      id: 'inactive',
      name: 'Inactive',
      getStatus: vi.fn(async () => ({ active: false }))
    })
    service.registerProvider({
      id: 'git',
      name: 'Git',
      getStatus: vi.fn(async () => ({
        active: true,
        stats: { filesChanged: 2, insertions: 8, deletions: 1 }
      }))
    })

    await expect(service.getStatus('/tmp/project')).resolves.toEqual({
      providerId: 'git',
      providerName: 'Git',
      stats: { filesChanged: 2, insertions: 8, deletions: 1 }
    })
  })

  it('returns null when no provider matches', async () => {
    const service = createVcsService()
    service.registerProvider({
      id: 'none',
      name: 'None',
      getStatus: vi.fn(async () => ({ active: false }))
    })

    await expect(service.getStatus('/tmp/project')).resolves.toBeNull()
  })

  it('caches statuses for the configured ttl', async () => {
    let currentTime = 1_000
    const getStatus = vi.fn(async () => ({
      active: true,
      stats: { filesChanged: 1, insertions: 12, deletions: 3 }
    }))
    const service = createVcsService({
      now: () => currentTime,
      ttlMs: 60_000
    })

    service.registerProvider({
      id: 'git',
      name: 'Git',
      getStatus
    })

    await expect(service.getStatus('/tmp/project')).resolves.toEqual({
      providerId: 'git',
      providerName: 'Git',
      stats: { filesChanged: 1, insertions: 12, deletions: 3 }
    })
    await expect(service.getStatus('/tmp/project')).resolves.toEqual({
      providerId: 'git',
      providerName: 'Git',
      stats: { filesChanged: 1, insertions: 12, deletions: 3 }
    })
    expect(getStatus).toHaveBeenCalledTimes(1)

    currentTime += 60_001

    await service.getStatus('/tmp/project')
    expect(getStatus).toHaveBeenCalledTimes(2)
  })
})
