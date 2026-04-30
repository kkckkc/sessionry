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

  it('splits a pane into a 50/50 group without losing stacked focus', () => {
    const service = new WorkspaceStore()

    service.splitPane('pane-terminal-primary', 'horizontal')

    const leftTabs = service.getPaneGroup('pane-group-left-tabs')
    expect(leftTabs?.activeChildId).toBeDefined()

    const splitGroupId = leftTabs?.activeChildId
    expect(splitGroupId).not.toBe('pane-terminal-primary')

    const splitGroup = service.getPaneGroup(splitGroupId!)
    expect(splitGroup).toMatchObject({
      direction: 'horizontal',
      children: [
        { kind: 'pane', paneId: 'pane-terminal-primary' },
        { kind: 'pane', paneId: expect.any(String) }
      ]
    })

    expect(service.getPane('pane-terminal-primary')).toMatchObject({ preferredSizePct: 50 })

    const createdPaneChild = splitGroup?.children.find(
      (child): child is Extract<(typeof splitGroup.children)[number], { kind: 'pane' }> =>
        child.kind === 'pane' && child.paneId !== 'pane-terminal-primary'
    )
    const createdPaneId = createdPaneChild?.paneId

    expect(createdPaneId).toBeDefined()
    expect(service.getPane(createdPaneId!)).toMatchObject({
      type: 'terminal',
      preferredSizePct: 50,
      state: { title: 'Terminal' }
    })
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



  it('splits a pane in a matching direction group by adding to the group', () => {
    const service = new WorkspaceStore()
    
    // Get the horizontal root group
    const rootGroup = service.getPaneGroup('pane-group-root')
    expect(rootGroup?.direction).toBe('horizontal')
    expect(rootGroup?.children.length).toBe(2)
    
    // Split a pane in the left tabs group horizontally
    // This should create a new horizontal group since left tabs is stacked
    service.splitPane('pane-terminal-primary', 'horizontal')
    
    // Now get that new horizontal group and split one of its panes horizontally
    const leftTabs = service.getPaneGroup('pane-group-left-tabs')
    const newGroupId = leftTabs?.activeChildId
    const newGroup = service.getPaneGroup(newGroupId!)
    expect(newGroup?.direction).toBe('horizontal')
    
    const firstPaneId = newGroup?.children[0]?.kind === 'pane' ? newGroup.children[0].paneId : null
    expect(firstPaneId).toBeTruthy()
    
    // Split the first pane horizontally - should add to existing horizontal group
    service.splitPane(firstPaneId!, 'horizontal')
    
    const updatedGroup = service.getPaneGroup(newGroupId!)
    expect(updatedGroup?.children.length).toBe(3) // Original 2 + 1 new
    expect(updatedGroup?.direction).toBe('horizontal')
  })

  it('splits a pane in a non-matching direction group by creating a new group', () => {
    const service = new WorkspaceStore()
    
    // Split a pane horizontally to create a horizontal group
    service.splitPane('pane-terminal-primary', 'horizontal')
    
    const leftTabs = service.getPaneGroup('pane-group-left-tabs')
    const horizontalGroupId = leftTabs?.activeChildId
    const horizontalGroup = service.getPaneGroup(horizontalGroupId!)
    expect(horizontalGroup?.direction).toBe('horizontal')
    
    const firstPaneId = horizontalGroup?.children[0]?.kind === 'pane' ? horizontalGroup.children[0].paneId : null
    
    // Split vertically - should create a new vertical group
    service.splitPane(firstPaneId!, 'vertical')
    
    const updatedHorizontalGroup = service.getPaneGroup(horizontalGroupId!)
    const newVerticalGroupChild = updatedHorizontalGroup?.children.find(c => c.kind === 'group')
    expect(newVerticalGroupChild).toBeTruthy()
    
    const verticalGroup = service.getPaneGroup((newVerticalGroupChild as any).paneGroupId)
    expect(verticalGroup?.direction).toBe('vertical')
    expect(verticalGroup?.children.length).toBe(2)
  })

  it('converts a pane to a stacked (tabbed) group', () => {
    const service = new WorkspaceStore()
    
    // Get a pane from the horizontal root group
    const rootGroup = service.getPaneGroup('pane-group-root')
    const leftTabsGroupChild = rootGroup?.children[0]
    expect(leftTabsGroupChild?.kind).toBe('group')
    
    // Get a pane from left tabs
    const leftTabs = service.getPaneGroup((leftTabsGroupChild as any).paneGroupId)
    const paneChild = leftTabs?.children[0]
    expect(paneChild?.kind).toBe('pane')
    const paneId = (paneChild as any).paneId
    
    // Convert the pane to tabs (adds new tab to existing stacked group)
    const result = service.convertPaneToTabs(paneId)
    
    // Since parent is already stacked, it returns the parent group with new tab added
    expect(result.id).toBe(leftTabs!.id)
    expect(result.direction).toBe('stacked')
    expect(result.children.length).toBe(3) // Original 2 panes + 1 new tab
    
    // Verify original pane is still there
    expect(result.children.some(c => c.kind === 'pane' && (c as any).paneId === paneId)).toBe(true)
    
    // Verify new terminal pane was added
    const newPaneChild = result.children.find(c => c.kind === 'pane' && (c as any).paneId !== paneId && (c as any).paneId !== 'pane-activity')
    expect(newPaneChild).toBeTruthy()
    
    // The new terminal pane should be active
    expect(result.activeChildId).toBe((newPaneChild as any).paneId)
  })

  it('converts a pane to tabs and preserves parent stacked group active state', () => {
    const service = new WorkspaceStore()
    
    // Get the active pane from left tabs (which is stacked)
    const leftTabs = service.getPaneGroup('pane-group-left-tabs')
    expect(leftTabs?.direction).toBe('stacked')
    
    const activePaneId = leftTabs?.activeChildId
    expect(activePaneId).toBeTruthy()
    
    // Convert the active pane to tabs (adds new tab to existing stacked group)
    const result = service.convertPaneToTabs(activePaneId!)
    
    // Since parent is already stacked, it returns the parent group with new tab added
    expect(result.id).toBe(leftTabs!.id)
    
    // Verify the new terminal pane is now active
    const newPaneChild = result.children.find(c => 
      c.kind === 'pane' && 
      (c as any).paneId !== activePaneId && 
      (c as any).paneId !== 'pane-activity'
    )
    expect(result.activeChildId).toBe((newPaneChild as any).paneId)
  })

  it('removes a pane and logs the tree structure', () => {
    const service = new WorkspaceStore()
    
    // Get left tabs group
    const leftTabs = service.getPaneGroup('pane-group-left-tabs')
    expect(leftTabs?.children.length).toBe(2)
    
    // Remove the activity pane
    service.removePane('pane-activity')
    
    // Verify it was removed
    const updatedLeftTabs = service.getPaneGroup('pane-group-left-tabs')
    expect(updatedLeftTabs?.children.length).toBe(1)
    expect(updatedLeftTabs?.children[0]).toEqual({ kind: 'pane', paneId: 'pane-terminal-primary' })
  })

  it('collapses horizontal/vertical groups with single child', () => {
    const service = new WorkspaceStore()
    
    // Create a horizontal split group with 2 panes
    const leftTabs = service.getPaneGroup('pane-group-left-tabs')!
    const firstPane = (leftTabs.children[0] as any).paneId
    const firstPaneData = service.getPane(firstPane)!
    service.splitPane(firstPane, 'horizontal')
    
    // Find the new horizontal group
    const updatedLeftTabs = service.getPaneGroup('pane-group-left-tabs')!
    const horizontalGroupChild = updatedLeftTabs.children.find(c => c.kind === 'group')
    expect(horizontalGroupChild).toBeTruthy()
    const horizontalGroup = service.getPaneGroup((horizontalGroupChild as any).paneGroupId)!
    expect(horizontalGroup.direction).toBe('horizontal')
    expect(horizontalGroup.children.length).toBe(2)
    
    // Verify the group name matches the pane title
    expect(horizontalGroup.name).toBe((firstPaneData.state as any).title)
    
    // Remove one pane from the horizontal group - should collapse
    const paneToRemove = (horizontalGroup.children[1] as any).paneId
    service.removePane(paneToRemove)
    
    // Verify the horizontal group was collapsed and removed
    expect(service.getPaneGroup(horizontalGroup.id)).toBeNull()
    
    // Verify the remaining pane was promoted to the parent (leftTabs)
    const finalLeftTabs = service.getPaneGroup('pane-group-left-tabs')!
    const promotedPane = finalLeftTabs.children.find(c => c.kind === 'pane' && (c as any).paneId === firstPane)
    expect(promotedPane).toBeTruthy()
  })

  it('names pane groups based on the pane title when converting to tabs', () => {
    const service = new WorkspaceStore()
    
    // Get a pane from the right column (vertical group)
    const rightColumn = service.getPaneGroup('pane-group-right-column')!
    const outlinePane = (rightColumn.children[0] as any).paneId
    const outlinePaneData = service.getPane(outlinePane)!
    
    // Convert to tabs
    const newGroup = service.convertPaneToTabs(outlinePane)
    
    // Verify the group name matches the pane title
    expect(newGroup.name).toBe((outlinePaneData.state as any).title)
    expect(newGroup.direction).toBe('stacked')
  })
