import { describe, expect, it, vi } from 'vitest'

import type { WorkspaceBridge, WorkspaceStateSnapshot } from '@sessionry/plugin-api'

import { createWorkspaceApi } from '@sessionry/plugin-api'

const snapshot: WorkspaceStateSnapshot = {
  projects: [{ id: 'project-1', name: 'Project', folder: '/tmp/project', metadata: {}, activeViews: {}, sessionIds: ['session-1'] }],
  sessions: [{ id: 'session-1', projectId: 'project-1', name: 'Session', folder: '/tmp/project', rootPaneGroupId: 'group-1' }],
  paneGroups: [
    {
      id: 'group-1',
      sessionId: 'session-1',
      name: 'Root',
      direction: 'stacked',
      preferredSizePct: 70,
      activeChildId: 'pane-1',
      children: [{ kind: 'pane', paneId: 'pane-1' }]
    }
  ],
  panes: [{ id: 'pane-1', sessionId: 'session-1', type: 'terminal', preferredSizePct: 30, state: {} }],
  activeSessionId: 'session-1'
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
    expect(project.sessions[0].rootPaneGroup.data.activeChildId).toBe('pane-1')
    expect(project.sessions[0].rootPaneGroup.data.preferredSizePct).toBe(70)
    expect(workspace.getProject('project-1')?.data.folder).toBe('/tmp/project')
    expect(workspace.getPane('pane-1')?.data.preferredSizePct).toBe(30)
  })

  it('routes mutations through handle methods and root project creation', async () => {
    const executeCommand = vi.fn(async () => ({ entityId: 'project-2' }))
    const transport: WorkspaceBridge = {
      read: () => snapshot,
      executeCommand,
      subscribeAll: () => () => {}
    }

    const workspace = createWorkspaceApi(transport)

    await workspace.projects[0].update({ name: 'Updated', activeViews: { workspace: 'workspace.default' } })
    await workspace.projects[0].sessions[0].activate()
    await workspace.projects[0].sessions[0].rootPaneGroup.update({ activeChildId: 'pane-1', preferredSizePct: 80 })
    await workspace.createProject({ name: 'Two', folder: '/tmp/two' })

    expect(executeCommand).toHaveBeenNthCalledWith(1, {
      type: 'project.update',
      projectId: 'project-1',
      input: { name: 'Updated', activeViews: { workspace: 'workspace.default' } }
    })
    expect(executeCommand).toHaveBeenNthCalledWith(2, {
      type: 'session.activate',
      sessionId: 'session-1'
    })
    expect(executeCommand).toHaveBeenNthCalledWith(3, {
      type: 'paneGroup.update',
      paneGroupId: 'group-1',
      input: { activeChildId: 'pane-1', preferredSizePct: 80 }
    })
    expect(executeCommand).toHaveBeenNthCalledWith(4, {
      type: 'project.create',
      input: { name: 'Two', folder: '/tmp/two' }
    })
  })
})
