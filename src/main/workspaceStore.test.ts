import { describe, expect, it } from 'vitest'

import { WorkspaceStore } from './workspaceStore'

describe('WorkspaceStore', () => {
  it('seeds a default project, session, root pane group, and terminal pane', () => {
    const service = new WorkspaceStore()

    const snapshot = service.read()
    expect(snapshot.projects).toHaveLength(1)
    expect(snapshot.sessions).toHaveLength(1)
    expect(snapshot.paneGroups.find((paneGroup) => paneGroup.id === 'pane-group-root')?.children).toEqual([
      { kind: 'pane', paneId: 'pane-terminal-primary' }
    ])
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
        { kind: 'pane', paneId: 'pane-terminal-primary' },
        { kind: 'pane', paneId: pane.id },
        { kind: 'pane', paneId: pane.id }
      ])
    ).toThrow(/duplicates/i)
  })

  it('moves nodes within a session and removes nested subtrees cleanly', () => {
    const service = new WorkspaceStore()
    const nested = service.createPaneGroup({
      id: 'nested',
      sessionId: 'session-primary',
      name: 'Nested',
      direction: 'vertical',
      parentPaneGroupId: 'pane-group-root'
    })
    const pane = service.createPane({
      id: 'pane-nested',
      sessionId: 'session-primary',
      type: 'terminal',
      state: {},
      parentPaneGroupId: nested.id
    })

    service.moveNode({ kind: 'pane', paneId: pane.id }, 'pane-group-root', 0)
    expect(service.getPaneGroup('pane-group-root')?.children).toEqual([
      { kind: 'pane', paneId: pane.id },
      { kind: 'pane', paneId: 'pane-terminal-primary' },
      { kind: 'group', paneGroupId: nested.id }
    ])

    service.removeNode({ kind: 'group', paneGroupId: nested.id })
    expect(service.getPaneGroup(nested.id)).toBeNull()
    expect(service.getPane(pane.id)).not.toBeNull()

    service.removeNode({ kind: 'pane', paneId: pane.id })
    expect(service.getPane(pane.id)).toBeNull()
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
      beforeChildren: [{ kind: 'pane', paneId: 'pane-terminal-primary' }],
      afterChildren: [
        { kind: 'pane', paneId: 'pane-terminal-primary' },
        { kind: 'pane', paneId: 'pane-event' }
      ]
    })
  })
})
