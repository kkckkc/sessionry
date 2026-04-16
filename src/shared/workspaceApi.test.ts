import { describe, expect, it, vi } from 'vitest'

import type { WorkspaceBridge } from './workspaceApi'
import type { WorkspaceStateSnapshot } from './workspace'

import { createWorkspaceApi } from './workspaceApi'

const snapshot: WorkspaceStateSnapshot = {
  projects: [{ id: 'project-1', name: 'Project', folder: '/tmp/project', metadata: {}, sessionIds: ['session-1'] }],
  sessions: [{ id: 'session-1', projectId: 'project-1', name: 'Session', folder: '/tmp/project', rootPaneGroupId: 'group-1' }],
  paneGroups: [{ id: 'group-1', sessionId: 'session-1', name: 'Root', direction: 'stacked', children: [{ kind: 'pane', paneId: 'pane-1' }] }],
  panes: [{ id: 'pane-1', sessionId: 'session-1', type: 'terminal', state: {} }]
}

describe('createWorkspaceApi', () => {
  it('exposes synchronous handle data and relationships over the read bridge', () => {
    const transport: WorkspaceBridge = {
      read: () => snapshot,
      executeCommand: async () => ({}),
      subscribeAll: () => () => {}
    }

    const workspace = createWorkspaceApi(transport)
    const project = workspace.projects[0]

    expect(project.data.name).toBe('Project')
    expect(project.sessions[0].data.name).toBe('Session')
    expect(project.sessions[0].rootPaneGroup.children[0].data.id).toBe('pane-1')
    expect(workspace.getProject('project-1')?.data.folder).toBe('/tmp/project')
  })

  it('routes mutations through handle methods and root project creation', async () => {
    const executeCommand = vi.fn(async () => ({ entityId: 'project-2' }))
    const transport: WorkspaceBridge = {
      read: () => snapshot,
      executeCommand,
      subscribeAll: () => () => {}
    }

    const workspace = createWorkspaceApi(transport)

    await workspace.projects[0].update({ name: 'Updated' })
    await workspace.projects[0].sessions[0].rootPaneGroup.insertPane('pane-2', 0)
    await workspace.createProject({ name: 'Two', folder: '/tmp/two' })

    expect(executeCommand).toHaveBeenNthCalledWith(1, {
      type: 'project.update',
      projectId: 'project-1',
      input: { name: 'Updated' }
    })
    expect(executeCommand).toHaveBeenNthCalledWith(2, {
      type: 'paneGroup.insertPane',
      paneGroupId: 'group-1',
      paneId: 'pane-2',
      index: 0
    })
    expect(executeCommand).toHaveBeenNthCalledWith(3, {
      type: 'project.create',
      input: { name: 'Two', folder: '/tmp/two' }
    })
  })
})
