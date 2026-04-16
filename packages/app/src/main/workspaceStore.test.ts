import { describe, expect, it } from 'vitest'

import { WorkspaceStore } from './workspaceStore'

describe('WorkspaceStore', () => {
  it('seeds a showcase workspace tree with horizontal, vertical, and stacked layouts', () => {
    const service = new WorkspaceStore()

    const snapshot = service.read()
    expect(snapshot.projects).toHaveLength(1)
    expect(snapshot.sessions).toHaveLength(2)
    expect(snapshot.projects[0]?.sessionIds).toEqual(['session-primary', 'session-secondary'])
    expect(snapshot.paneGroups.find((paneGroup) => paneGroup.id === 'pane-group-root')).toMatchObject({
      direction: 'horizontal',
      children: [
        { kind: 'group', paneGroupId: 'pane-group-left-tabs' },
        { kind: 'group', paneGroupId: 'pane-group-right-column' }
      ]
    })
    expect(snapshot.paneGroups.find((paneGroup) => paneGroup.id === 'pane-group-left-tabs')).toMatchObject({
      direction: 'stacked',
      activeChildId: 'pane-terminal-primary'
    })
    expect(snapshot.projects[0]?.activeViews).toEqual({})
    expect(snapshot.activeSessionId).toBe('session-primary')
    expect(snapshot.panes.find((pane) => pane.id === 'pane-terminal-primary')).toMatchObject({
      preferredSizePct: 50
    })
    expect(snapshot.paneGroups.find((paneGroup) => paneGroup.id === 'pane-group-secondary-root')).toMatchObject({
      direction: 'stacked',
      activeChildId: 'pane-terminal-secondary'
    })
  })

  it('activates sessions explicitly and preserves the current session when adding more', () => {
    const service = new WorkspaceStore()
    const events: Array<{ type: string; beforeSessionId?: string; afterSessionId?: string }> = []
    service.subscribeAll((event) => {
      if (event.type === 'session.activated') {
        events.push({
          type: event.type,
          beforeSessionId: event.beforeSessionId,
          afterSessionId: event.afterSessionId
        })
      }
    })
    const project = service.createProject({ id: 'project-2', name: 'Two', folder: '/tmp/two' })

    const sessionA = service.createSession({
      id: 'session-a',
      projectId: project.id,
      name: 'A',
      folder: '/tmp/two/a',
      rootPaneGroupId: 'root-a'
    })
    const sessionB = service.createSession({
      id: 'session-b',
      projectId: project.id,
      name: 'B',
      folder: '/tmp/two/b',
      rootPaneGroupId: 'root-b'
    })

    expect(service.read().activeSessionId).toBe('session-primary')

    service.activateSession(sessionB.id)

    expect(service.read().activeSessionId).toBe(sessionB.id)
    expect(events).toContainEqual({
      type: 'session.activated',
      beforeSessionId: 'session-primary',
      afterSessionId: sessionB.id
    })
    expect(sessionA.id).toBe('session-a')
  })

  it('falls back to the next appropriate session when removing the active session', () => {
    const service = new WorkspaceStore()
    const project = service.createProject({ id: 'project-2', name: 'Two', folder: '/tmp/two' })
    const sessionA = service.createSession({
      id: 'session-a',
      projectId: project.id,
      name: 'A',
      folder: '/tmp/two/a',
      rootPaneGroupId: 'root-a'
    })
    const sessionB = service.createSession({
      id: 'session-b',
      projectId: project.id,
      name: 'B',
      folder: '/tmp/two/b',
      rootPaneGroupId: 'root-b'
    })

    service.activateSession(sessionA.id)
    service.removeSession(sessionA.id)
    expect(service.read().activeSessionId).toBe(sessionB.id)

    service.activateSession('session-primary')
    service.removeSession('session-primary')
    expect(service.read().activeSessionId).toBe('session-secondary')

    service.removeSession('session-secondary')
    service.removeSession(sessionB.id)
    expect(service.read().activeSessionId).toBeUndefined()
  })

  it('sets the first created session active when starting from an empty workspace', () => {
    const service = new WorkspaceStore()

    service.removeSession('session-primary')
    expect(service.read().activeSessionId).toBe('session-secondary')
    service.removeSession('session-secondary')
    expect(service.read().activeSessionId).toBeUndefined()

    const project = service.createProject({ id: 'project-2', name: 'Two', folder: '/tmp/two' })
    const session = service.createSession({
      id: 'session-a',
      projectId: project.id,
      name: 'A',
      folder: '/tmp/two/a',
      rootPaneGroupId: 'root-a'
    })

    expect(service.read().activeSessionId).toBe(session.id)
  })

  it('creates sessions and pane trees, and rejects cross-session inserts', () => {
    const service = new WorkspaceStore()
    const project = service.createProject({ id: 'project-2', name: 'Two', folder: '/tmp/two' })
    const sessionA = service.createSession({
      id: 'session-a',
      projectId: project.id,
      name: 'A',
      folder: '/tmp/two/a',
      rootPaneGroupId: 'root-a'
    })
    const sessionB = service.createSession({
      id: 'session-b',
      projectId: project.id,
      name: 'B',
      folder: '/tmp/two/b',
      rootPaneGroupId: 'root-b'
    })
    expect(sessionB.id).toBe('session-b')

    const pane = service.createPane({
      id: 'pane-a',
      sessionId: sessionA.id,
      type: 'terminal',
      state: {}
    })

    expect(() => service.insertPane('root-b', pane.id)).toThrow(/cross session/i)
  })

  it('rejects invalid parent references and duplicate child references', () => {
    const service = new WorkspaceStore()

    expect(() =>
      service.createPaneGroup({
        sessionId: 'session-primary',
        name: 'Nested',
        direction: 'horizontal',
        parentPaneGroupId: 'missing-parent'
      })
    ).toThrow(/not found/i)

    const pane = service.createPane({
      id: 'pane-extra',
      sessionId: 'session-primary',
      type: 'terminal',
      state: {}
    })
    service.insertPane('pane-group-root', pane.id)

    expect(() =>
      service.setPaneGroupChildren('pane-group-root', [
        { kind: 'group', paneGroupId: 'pane-group-left-tabs' },
        { kind: 'group', paneGroupId: 'pane-group-right-column' },
        { kind: 'pane', paneId: pane.id },
        { kind: 'pane', paneId: pane.id }
      ])
    ).toThrow(/duplicates/i)
  })

  it('creates and updates preferred sizes and stacked active children', () => {
    const service = new WorkspaceStore()
    const group = service.createPaneGroup({
      id: 'stacked-group',
      sessionId: 'session-primary',
      name: 'Stacked',
      direction: 'stacked',
      preferredSizePct: 35
    })
    const firstPane = service.createPane({
      id: 'pane-first',
      sessionId: 'session-primary',
      type: 'terminal',
      preferredSizePct: 65,
      state: {},
      parentPaneGroupId: group.id
    })
    const secondPane = service.createPane({
      id: 'pane-second',
      sessionId: 'session-primary',
      type: 'terminal',
      state: {},
      parentPaneGroupId: group.id
    })

    expect(service.getPaneGroup(group.id)).toMatchObject({
      preferredSizePct: 35,
      activeChildId: firstPane.id
    })
    expect(service.getPane(firstPane.id)).toMatchObject({ preferredSizePct: 65 })

    service.updatePaneGroup(group.id, { activeChildId: secondPane.id, preferredSizePct: 45 })
    service.updatePane(firstPane.id, { preferredSizePct: 55 })

    expect(service.getPaneGroup(group.id)).toMatchObject({
      preferredSizePct: 45,
      activeChildId: secondPane.id
    })
    expect(service.getPane(firstPane.id)).toMatchObject({ preferredSizePct: 55 })
  })

  it('moves nodes within a session and reconciles stacked active tabs on removal', () => {
    const service = new WorkspaceStore()
    const nested = service.createPaneGroup({
      id: 'nested',
      sessionId: 'session-primary',
      name: 'Nested',
      direction: 'stacked',
      parentPaneGroupId: 'pane-group-left-tabs'
    })
    const pane = service.createPane({
      id: 'pane-nested',
      sessionId: 'session-primary',
      type: 'terminal',
      state: {},
      parentPaneGroupId: nested.id
    })

    service.moveNode({ kind: 'pane', paneId: pane.id }, 'pane-group-left-tabs', 0)
    expect(service.getPaneGroup('pane-group-left-tabs')).toMatchObject({
      activeChildId: 'pane-terminal-primary',
      children: [
        { kind: 'pane', paneId: pane.id },
        { kind: 'pane', paneId: 'pane-terminal-primary' },
        { kind: 'pane', paneId: 'pane-activity' },
        { kind: 'group', paneGroupId: nested.id }
      ]
    })

    service.removeNode({ kind: 'group', paneGroupId: nested.id })
    expect(service.getPaneGroup(nested.id)).toBeNull()
    expect(service.getPane(pane.id)).not.toBeNull()

    service.updatePaneGroup('pane-group-left-tabs', { activeChildId: pane.id })
    service.removeNode({ kind: 'pane', paneId: pane.id })
    expect(service.getPane(pane.id)).toBeNull()
    expect(service.getPaneGroup('pane-group-left-tabs')?.activeChildId).toBe('pane-terminal-primary')
  })

  it('emits typed events with before and after payloads', () => {
    const service = new WorkspaceStore()
    const events: string[] = []
    let updateEvent: unknown
    let childrenChangedEvent: unknown

    service.subscribeAll((event) => {
      events.push(event.type)
      if (event.type === 'project.updated') updateEvent = event
      if (event.type === 'paneGroup.childrenChanged') childrenChangedEvent = event
    })

    service.updateProject('project-primary', { name: 'Renamed' })
    const pane = service.createPane({
      id: 'pane-event',
      sessionId: 'session-primary',
      type: 'terminal',
      state: {}
    })
    service.insertPane('pane-group-root', pane.id)

    expect(events).toContain('project.updated')
    expect(updateEvent).toMatchObject({
      entityId: 'project-primary',
      before: { name: 'Primary Project' },
      after: { name: 'Renamed' }
    })
    expect(childrenChangedEvent).toMatchObject({
      entityId: 'pane-group-root',
      beforeChildren: [
        { kind: 'group', paneGroupId: 'pane-group-left-tabs' },
        { kind: 'group', paneGroupId: 'pane-group-right-column' }
      ],
      afterChildren: [
        { kind: 'group', paneGroupId: 'pane-group-left-tabs' },
        { kind: 'group', paneGroupId: 'pane-group-right-column' },
        { kind: 'pane', paneId: 'pane-event' }
      ]
    })
  })

  it('persists project-level active view selections through create and update', () => {
    const service = new WorkspaceStore()

    const project = service.createProject({
      id: 'project-views',
      name: 'Views',
      folder: '/tmp/views',
      activeViews: { workspace: 'workspace.default' }
    })

    expect(service.getProject(project.id)).toMatchObject({
      activeViews: { workspace: 'workspace.default' }
    })

    service.updateProject(project.id, { activeViews: { workspace: 'workspace.alt' } })

    expect(service.getProject(project.id)).toMatchObject({
      activeViews: { workspace: 'workspace.alt' }
    })
  })
})
