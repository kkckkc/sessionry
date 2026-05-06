import { describe, expect, it, vi } from 'vitest';

import { createVcsService } from './vcsService';

describe('createVcsService', () => {
  it('returns the first active provider by priority', async () => {
    const service = createVcsService();
    service.registerProvider({
      id: 'low',
      name: 'Low',
      priority: 1,
      getStatus: vi.fn(async () => ({
        active: true,
        stats: { filesChanged: 1, insertions: 2, deletions: 3 }
      }))
    });
    service.registerProvider({
      id: 'high',
      name: 'High',
      priority: 10,
      getStatus: vi.fn(async () => ({
        active: true,
        stats: { filesChanged: 4, insertions: 5, deletions: 6 }
      }))
    });

    await expect(service.getStatus('/tmp/project')).resolves.toEqual({
      providerId: 'high',
      providerName: 'High',
      stats: { filesChanged: 4, insertions: 5, deletions: 6 },
      files: []
    });
  });

  it('skips inactive and failing providers', async () => {
    const service = createVcsService();
    service.registerProvider({
      id: 'broken',
      name: 'Broken',
      getStatus: vi.fn(async () => {
        throw new Error('boom');
      })
    });
    service.registerProvider({
      id: 'inactive',
      name: 'Inactive',
      getStatus: vi.fn(async () => ({ active: false }))
    });
    service.registerProvider({
      id: 'git',
      name: 'Git',
      getStatus: vi.fn(async () => ({
        active: true,
        stats: { filesChanged: 2, insertions: 8, deletions: 1 }
      }))
    });

    await expect(service.getStatus('/tmp/project')).resolves.toEqual({
      providerId: 'git',
      providerName: 'Git',
      stats: { filesChanged: 2, insertions: 8, deletions: 1 },
      files: []
    });
  });

  it('returns null when no provider matches', async () => {
    const service = createVcsService();
    service.registerProvider({
      id: 'none',
      name: 'None',
      getStatus: vi.fn(async () => ({ active: false }))
    });

    await expect(service.getStatus('/tmp/project')).resolves.toBeNull();
  });

  it('caches statuses for the configured ttl', async () => {
    let currentTime = 1_000;
    const getStatus = vi.fn(async () => ({
      active: true,
      stats: { filesChanged: 1, insertions: 12, deletions: 3 }
    }));
    const service = createVcsService({
      now: () => currentTime,
      ttlMs: 60_000
    });

    service.registerProvider({
      id: 'git',
      name: 'Git',
      getStatus
    });

    await expect(service.getStatus('/tmp/project')).resolves.toEqual({
      providerId: 'git',
      providerName: 'Git',
      stats: { filesChanged: 1, insertions: 12, deletions: 3 },
      files: []
    });
    await expect(service.getStatus('/tmp/project')).resolves.toEqual({
      providerId: 'git',
      providerName: 'Git',
      stats: { filesChanged: 1, insertions: 12, deletions: 3 },
      files: []
    });
    expect(getStatus).toHaveBeenCalledTimes(1);

    currentTime += 60_001;

    await service.getStatus('/tmp/project');
    expect(getStatus).toHaveBeenCalledTimes(2);
  });

  it('preserves provider file entries in the resolved status', async () => {
    const service = createVcsService();
    service.registerProvider({
      id: 'git',
      name: 'Git',
      getStatus: vi.fn(async () => ({
        active: true,
        stats: { filesChanged: 2, insertions: 8, deletions: 1 },
        files: [
          { path: 'packages/app/src/main/plugins.ts', status: 'M' },
          { path: '.bob/notes/pending-notes.txt', status: '??' }
        ]
      }))
    });

    await expect(service.getStatus('/tmp/project')).resolves.toEqual({
      providerId: 'git',
      providerName: 'Git',
      stats: { filesChanged: 2, insertions: 8, deletions: 1 },
      files: [
        { path: 'packages/app/src/main/plugins.ts', status: 'M' },
        { path: '.bob/notes/pending-notes.txt', status: '??' }
      ]
    });
  });

  it('returns diffs from the first active provider that supports them', async () => {
    const service = createVcsService();
    service.registerProvider({
      id: 'git',
      name: 'Git',
      getStatus: vi.fn(async () => ({ active: true })),
      getDiff: vi.fn(async () => 'diff --git a/file.ts b/file.ts\n')
    });

    await expect(service.getDiff('/tmp/project', { path: 'file.ts', status: 'M' })).resolves.toBe(
      'diff --git a/file.ts b/file.ts\n'
    );
  });
});
