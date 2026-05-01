import fs from 'node:fs'
import path from 'node:path'

import type {
  WorkspaceEvent,
  WorkspaceEventListener,
  WorkspaceCommand,
  WorkspaceCommandResult,
  WorkspaceStateSnapshot,
  CreatePaneGroupInput,
  CreatePaneInput,
  CreateProjectInput,
  CreateSessionInput,
  Pane,
  PaneGroup,
  PaneGroupChild,
  PaneGroupChildPane,
  PaneGroupLayout,
  Project,
  Session,
  Unsubscribe,
  UpdatePaneGroupInput,
  UpdatePaneInput,
  UpdateProjectInput,
  UpdateSessionInput
} from '@sessionry/plugin-api'

// workspace.json — lightweight index of which projects exist and their folders
type PersistedWorkspace = {
  version: 1
  activeSessionId?: string
  projects: Array<{ id: string; folder: string }>
}

// <project-folder>/.sessionry/state.json — full project state
type PersistedProjectState = {
  version: 1
  project: Project
  sessions: Session[]
  paneGroups: PaneGroup[]
  panes: Pane[]
}

type EntityMaps = {
  projects: Map<string, Project>
  sessions: Map<string, Session>
  paneGroups: Map<string, PaneGroup>
  panes: Map<string, Pane>
  projectOrder: string[]
  activeSessionId?: string
}

const cloneValue = <T>(value: T): T => structuredClone(value)

const paneNodeId = (child: PaneGroupChild): string =>
  child.kind === 'pane' ? child.paneId : child.paneGroupId

const isPaneChild = (child: PaneGroupChild): child is PaneGroupChildPane => child.kind === 'pane'

export class WorkspaceStore {
  private readonly state: EntityMaps = {
    projects: new Map(),
    sessions: new Map(),
    paneGroups: new Map(),
    panes: new Map(),
    projectOrder: [],
    activeSessionId: undefined
  }

  private readonly listeners = new Set<WorkspaceEventListener>()
  private readonly listenersByType = new Map<WorkspaceEvent['type'], Set<WorkspaceEventListener>>()
  private nextId = 1
  private readonly workspaceFilePath: string | undefined
  private workspaceDirty = false
  private readonly dirtyProjectIds = new Set<string>()
  private saveTimer: ReturnType<typeof setTimeout> | undefined

  constructor(workspaceFilePath?: string) {
    this.workspaceFilePath = workspaceFilePath
    if (!workspaceFilePath || !this.loadState(workspaceFilePath)) {
      this.seedInitialState()
    }
  }

  read(): WorkspaceStateSnapshot {
    return {
      projects: this.state.projectOrder.map((projectId) => cloneValue(this.getProjectRequired(projectId))),
      sessions: Array.from(this.state.sessions.values()).map((session) => cloneValue(session)),
      paneGroups: Array.from(this.state.paneGroups.values()).map((paneGroup) => cloneValue(paneGroup)),
      panes: Array.from(this.state.panes.values()).map((pane) => cloneValue(pane)),
      activeSessionId: this.state.activeSessionId
    }
  }

  getProject(id: string): Project | null {
    return this.cloneOrNull(this.state.projects.get(id))
  }

  getSession(id: string): Session | null {
    return this.cloneOrNull(this.state.sessions.get(id))
  }

  getPaneGroup(id: string): PaneGroup | null {
    return this.cloneOrNull(this.state.paneGroups.get(id))
  }

  getPane(id: string): Pane | null {
    return this.cloneOrNull(this.state.panes.get(id))
  }

  subscribeAll(listener: WorkspaceEventListener): Unsubscribe {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  subscribe(type: WorkspaceEvent['type'], listener: WorkspaceEventListener): Unsubscribe {
    const listeners = this.listenersByType.get(type) ?? new Set<WorkspaceEventListener>()
    listeners.add(listener)
    this.listenersByType.set(type, listeners)

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) this.listenersByType.delete(type)
    }
  }

  executeCommand(command: WorkspaceCommand): WorkspaceCommandResult {
    // Capture which files need saving BEFORE execution so that entities
    // that are removed during the command are still accessible for lookup.
    const saveOpts = this.determineSaveOpts(command)

    let result: WorkspaceCommandResult
    switch (command.type) {
      case 'project.create':
        result = { entityId: this.createProject(command.input).id }
        break
      case 'project.update':
        result = { entityId: this.updateProject(command.projectId, command.input).id }
        break
      case 'project.remove':
        this.removeProject(command.projectId)
        result = { entityId: command.projectId }
        break
      case 'session.create':
        result = { entityId: this.createSession(command.input).id }
        break
      case 'session.activate':
        result = { entityId: this.activateSession(command.sessionId).id }
        break
      case 'session.update':
        result = { entityId: this.updateSession(command.sessionId, command.input).id }
        break
      case 'session.remove':
        this.removeSession(command.sessionId)
        result = { entityId: command.sessionId }
        break
      case 'session.setRootPaneGroup':
        result = {
          entityId: this.setSessionRootPaneGroup(
            command.sessionId,
            command.rootPaneGroupId
          ).id
        }
        break
      case 'paneGroup.create':
        result = { entityId: this.createPaneGroup(command.input).id }
        break
      case 'paneGroup.update':
        result = {
          entityId: this.updatePaneGroup(command.paneGroupId, command.input).id
        }
        break
      case 'paneGroup.setChildren':
        result = {
          entityId: this.setPaneGroupChildren(command.paneGroupId, command.children).id
        }
        break
      case 'paneGroup.insertPane':
        result = {
          entityId: this.insertPane(command.paneGroupId, command.paneId, command.index).id
        }
        break
      case 'paneGroup.insertPaneGroup':
        result = {
          entityId: this.insertPaneGroup(
            command.paneGroupId,
            command.childPaneGroupId,
            command.index
          ).id
        }
        break
      case 'paneGroup.split':
        result = {
          entityId: this.splitPaneGroup(command.paneGroupId, command.direction, command.newChild).id
        }
        break
      case 'paneNode.move':
        result = {
          entityId: this.moveNode(command.node, command.targetPaneGroupId, command.index).id
        }
        break
      case 'paneNode.remove':
        this.removeNode(command.node)
        result = { entityId: paneNodeId(command.node) }
        break
      case 'pane.create':
        result = { entityId: this.createPane(command.input).id }
        break
      case 'pane.split':
        result = { entityId: this.splitPane(command.paneId, command.direction).id }
        break
      case 'pane.convertToTabs':
        result = { entityId: this.convertPaneToTabs(command.paneId).id }
        break
      case 'pane.update':
        result = { entityId: this.updatePane(command.paneId, command.input).id }
        break
      case 'pane.remove':
        this.removePane(command.paneId)
        result = { entityId: command.paneId }
        break
      default:
        return this.assertNever(command)
    }

    // For project.create the new project ID isn't known until after execution.
    if (command.type === 'project.create') saveOpts.projectId = result.entityId ?? null
    this.scheduleSave(saveOpts)
    return result
  }

  createProject(input: CreateProjectInput): Project {
    const project: Project = {
      id: input.id ?? this.generateId('project'),
      name: input.name,
      folder: input.folder,
      metadata: cloneValue(input.metadata ?? {}),
      activeViews: cloneValue(input.activeViews ?? {}),
      sessionIds: []
    }

    if (this.state.projects.has(project.id)) {
      throw new Error(`Project "${project.id}" already exists.`)
    }

    this.state.projects.set(project.id, project)
    this.state.projectOrder.push(project.id)
    this.emit({
      type: 'project.created',
      entityType: 'project',
      entityId: project.id,
      after: cloneValue(project)
    })
    return cloneValue(project)
  }

  updateProject(projectId: string, input: UpdateProjectInput): Project {
    const project = this.getProjectRequired(projectId)
    const before = cloneValue(project)

    project.name = input.name ?? project.name
    project.folder = input.folder ?? project.folder
    if (input.metadata) project.metadata = cloneValue(input.metadata)
    if (input.activeViews) project.activeViews = cloneValue(input.activeViews)

    this.emit({
      type: 'project.updated',
      entityType: 'project',
      entityId: project.id,
      before,
      after: cloneValue(project)
    })
    return cloneValue(project)
  }

  removeProject(projectId: string): void {
    const project = this.getProjectRequired(projectId)

    for (const sessionId of [...project.sessionIds]) {
      this.removeSession(sessionId)
    }

    this.state.projects.delete(projectId)
    this.state.projectOrder = this.state.projectOrder.filter((id) => id !== projectId)

    this.emit({
      type: 'project.removed',
      entityType: 'project',
      entityId: project.id,
      before: cloneValue(project)
    })
  }

  createSession(input: CreateSessionInput): Session {
    const project = this.getProjectRequired(input.projectId)
    const sessionId = input.id ?? this.generateId('session')
    if (this.state.sessions.has(sessionId)) {
      throw new Error(`Session "${sessionId}" already exists.`)
    }

    const rootPaneGroupId = input.rootPaneGroupId ?? this.generateId('pane-collection')
    if (this.state.paneGroups.has(rootPaneGroupId)) {
      throw new Error(`Pane group "${rootPaneGroupId}" already exists.`)
    }

    const rootPaneGroup: PaneGroup = {
      id: rootPaneGroupId,
      sessionId,
      name: 'Root',
      direction: 'stacked',
      preferredSizePct: undefined,
      activeChildId: undefined,
      children: []
    }
    this.state.paneGroups.set(rootPaneGroupId, rootPaneGroup)

    const session: Session = {
      id: sessionId,
      projectId: project.id,
      name: input.name,
      folder: input.folder,
      rootPaneGroupId
    }

    this.state.sessions.set(sessionId, session)
    project.sessionIds = [...project.sessionIds, sessionId]
    if (!this.state.activeSessionId) {
      this.state.activeSessionId = session.id
    }

    this.emit({
      type: 'session.created',
      entityType: 'session',
      entityId: session.id,
      projectId: project.id,
      after: cloneValue(session)
    })
    this.emit({
      type: 'paneGroup.created',
      entityType: 'paneGroup',
      entityId: rootPaneGroup.id,
      sessionId: session.id,
      projectId: project.id,
      after: cloneValue(rootPaneGroup)
    })

    return cloneValue(session)
  }

  updateSession(sessionId: string, input: UpdateSessionInput): Session {
    const session = this.getSessionRequired(sessionId)
    const before = cloneValue(session)
    session.name = input.name ?? session.name
    session.folder = input.folder ?? session.folder
    if (input.rootPaneGroupId !== undefined) {
      session.rootPaneGroupId = input.rootPaneGroupId
    }

    this.emit({
      type: 'session.updated',
      entityType: 'session',
      entityId: session.id,
      projectId: session.projectId,
      sessionId: session.id,
      before,
      after: cloneValue(session)
    })
    return cloneValue(session)
  }

  activateSession(sessionId: string): Session {
    const session = this.getSessionRequired(sessionId)
    const beforeSessionId = this.state.activeSessionId
    this.state.activeSessionId = session.id
    this.emit({
      type: 'session.activated',
      entityType: 'session',
      entityId: session.id,
      projectId: session.projectId,
      sessionId: session.id,
      beforeSessionId,
      afterSessionId: session.id
    })
    return cloneValue(session)
  }

  removeSession(sessionId: string): void {
    const session = this.getSessionRequired(sessionId)
    const project = this.getProjectRequired(session.projectId)
    const nextActiveSessionId =
      this.state.activeSessionId === session.id ? this.getNextActiveSessionId(session) : this.state.activeSessionId

    this.removePaneGroupRecursive(session.rootPaneGroupId)
    this.state.sessions.delete(sessionId)
    project.sessionIds = project.sessionIds.filter((id) => id !== sessionId)
    this.state.activeSessionId = nextActiveSessionId

    this.emit({
      type: 'session.removed',
      entityType: 'session',
      entityId: session.id,
      projectId: session.projectId,
      sessionId: session.id,
      before: cloneValue(session)
    })
  }

  setSessionRootPaneGroup(sessionId: string, rootPaneGroupId: string): Session {
    const session = this.getSessionRequired(sessionId)
    const paneGroup = this.getPaneGroupRequired(rootPaneGroupId)
    if (paneGroup.sessionId !== session.id) {
      throw new Error('A session root pane group must belong to the same session.')
    }

    const parent = this.findParentOfNode({ kind: 'group', paneGroupId: rootPaneGroupId })
    if (parent) {
      throw new Error('A root pane group cannot also be nested under another pane group.')
    }

    const before = cloneValue(session)
    session.rootPaneGroupId = rootPaneGroupId

    this.emit({
      type: 'session.updated',
      entityType: 'session',
      entityId: session.id,
      projectId: session.projectId,
      sessionId: session.id,
      before,
      after: cloneValue(session)
    })
    return cloneValue(session)
  }

  createPaneGroup(input: CreatePaneGroupInput): PaneGroup {
    this.getSessionRequired(input.sessionId)

    const paneGroup: PaneGroup = {
      id: input.id ?? this.generateId('pane-collection'),
      sessionId: input.sessionId,
      name: input.name,
      direction: input.direction,
      preferredSizePct: input.preferredSizePct,
      activeChildId: input.activeChildId,
      children: []
    }

    if (this.state.paneGroups.has(paneGroup.id)) {
      throw new Error(`Pane group "${paneGroup.id}" already exists.`)
    }

    this.state.paneGroups.set(paneGroup.id, paneGroup)

    this.emit({
      type: 'paneGroup.created',
      entityType: 'paneGroup',
      entityId: paneGroup.id,
      projectId: this.getSessionProjectId(input.sessionId),
      sessionId: input.sessionId,
      after: cloneValue(paneGroup)
    })

    if (input.parentPaneGroupId) {
      this.insertPaneGroup(input.parentPaneGroupId, paneGroup.id, input.index)
    }

    return cloneValue(paneGroup)
  }

  updatePaneGroup(
    paneGroupId: string,
    input: UpdatePaneGroupInput
  ): PaneGroup {
    const paneGroup = this.getPaneGroupRequired(paneGroupId)
    const before = cloneValue(paneGroup)
    paneGroup.name = input.name ?? paneGroup.name
    paneGroup.direction = input.direction ?? paneGroup.direction
    paneGroup.preferredSizePct = input.preferredSizePct ?? paneGroup.preferredSizePct
    paneGroup.activeChildId = input.activeChildId ?? paneGroup.activeChildId
    this.normalizeStackedGroupActiveChild(paneGroup)

    this.emit({
      type: 'paneGroup.updated',
      entityType: 'paneGroup',
      entityId: paneGroup.id,
      projectId: this.getSessionProjectId(paneGroup.sessionId),
      sessionId: paneGroup.sessionId,
      paneGroupId: paneGroup.id,
      before,
      after: cloneValue(paneGroup)
    })
    return cloneValue(paneGroup)
  }

  setPaneGroupChildren(
    paneGroupId: string,
    children: PaneGroupChild[]
  ): PaneGroup {
    const paneGroup = this.getPaneGroupRequired(paneGroupId)
    const beforeChildren = cloneValue(paneGroup.children)

    this.validateChildren(children, paneGroup.sessionId, paneGroup.id)

    const currentIds = beforeChildren.map(paneNodeId).sort()
    const nextIds = children.map(paneNodeId).sort()
    if (currentIds.length !== nextIds.length || currentIds.some((id, index) => id !== nextIds[index])) {
      throw new Error('setPaneGroupChildren only supports reordering the current children.')
    }

    paneGroup.children = cloneValue(children)

    this.emit({
      type: 'paneGroup.childrenChanged',
      entityType: 'paneGroup',
      entityId: paneGroup.id,
      projectId: this.getSessionProjectId(paneGroup.sessionId),
      sessionId: paneGroup.sessionId,
      paneGroupId: paneGroup.id,
      beforeChildren,
      afterChildren: cloneValue(paneGroup.children)
    })
    return cloneValue(paneGroup)
  }

  insertPane(paneGroupId: string, paneId: string, index?: number): PaneGroup {
    const paneGroup = this.getPaneGroupRequired(paneGroupId)
    const pane = this.getPaneRequired(paneId)
    this.assertSameSession(pane.sessionId, paneGroup.sessionId)

    if (this.findParentOfNode({ kind: 'pane', paneId })) {
      throw new Error('Pane is already attached to a pane group; use moveNode instead.')
    }

    const beforeChildren = cloneValue(paneGroup.children)
    paneGroup.children = this.insertChild(
      paneGroup.children,
      { kind: 'pane', paneId },
      index
    )
    this.ensureStackedGroupHasActiveChild(paneGroup)

    this.emitChildrenChanged(paneGroup, beforeChildren)
    return cloneValue(paneGroup)
  }

  insertPaneGroup(
    paneGroupId: string,
    childPaneGroupId: string,
    index?: number
  ): PaneGroup {
    const paneGroup = this.getPaneGroupRequired(paneGroupId)
    const child = this.getPaneGroupRequired(childPaneGroupId)
    this.assertSameSession(child.sessionId, paneGroup.sessionId)
    if (child.id === paneGroup.id) {
      throw new Error('A pane group cannot contain itself.')
    }

    const session = this.getSessionRequired(child.sessionId)
    if (session.rootPaneGroupId === child.id) {
      throw new Error('A session root pane group cannot be inserted under another pane group.')
    }

    if (this.findParentOfNode({ kind: 'group', paneGroupId: child.id })) {
      throw new Error('Pane group is already attached; use moveNode instead.')
    }
    if (this.isDescendant(child.id, paneGroup.id)) {
      throw new Error('Cannot create a pane group cycle.')
    }

    const beforeChildren = cloneValue(paneGroup.children)
    paneGroup.children = this.insertChild(
      paneGroup.children,
      { kind: 'group', paneGroupId: child.id },
      index
    )
    this.ensureStackedGroupHasActiveChild(paneGroup)

    this.emitChildrenChanged(paneGroup, beforeChildren)
    return cloneValue(paneGroup)
  }

  moveNode(
    node: PaneGroupChild,
    targetPaneGroupId: string,
    index?: number
  ): PaneGroup {
    const target = this.getPaneGroupRequired(targetPaneGroupId)
    const sourceParent = this.findParentOfNode(node)
    if (!sourceParent) throw new Error('Node is not attached to a pane group.')

    const nodeSessionId = isPaneChild(node)
      ? this.getPaneRequired(node.paneId).sessionId
      : this.getPaneGroupRequired(node.paneGroupId).sessionId
    this.assertSameSession(nodeSessionId, target.sessionId)

    if (!isPaneChild(node)) {
      const session = this.getSessionRequired(nodeSessionId)
      if (session.rootPaneGroupId === node.paneGroupId) {
        throw new Error('A session root pane group cannot be moved under another pane group.')
      }
      if (target.id === node.paneGroupId || this.isDescendant(node.paneGroupId, target.id)) {
        throw new Error('Cannot create a pane group cycle.')
      }
    }

    const sourceBefore = cloneValue(sourceParent.children)
    sourceParent.children = sourceParent.children.filter((child) => paneNodeId(child) !== paneNodeId(node))
    this.reconcileActiveChildAfterRemoval(sourceParent, paneNodeId(node))
    this.emitChildrenChanged(sourceParent, sourceBefore)

    const targetBefore = cloneValue(target.children)
    target.children = this.insertChild(target.children, cloneValue(node), index)
    this.ensureStackedGroupHasActiveChild(target)
    this.emitChildrenChanged(target, targetBefore)

    return cloneValue(target)
  }

  removeNode(node: PaneGroupChild): void {
    const parent = this.findParentOfNode(node)
    if (!parent) throw new Error('Node is not attached to a pane group.')
    
    // Helper to render tree structure
    const renderTree = (child: PaneGroupChild, indent = ''): string => {
      if (child.kind === 'pane') {
        const p = this.state.panes.get(child.paneId)
        return `${indent}├─ Pane: ${child.paneId} (${p?.preferredSizePct ?? 0}%)`
      }
      const g = this.state.paneGroups.get(child.paneGroupId)
      if (!g) return `${indent}├─ Group: ${child.paneGroupId} (not found)`
      let result = `${indent}├─ Group: ${child.paneGroupId} [${g.direction}] (${g.preferredSizePct ?? 0}%)`
      g.children.forEach((c, i) => {
        const isLast = i === g.children.length - 1
        result += '\n' + renderTree(c, indent + (isLast ? '   ' : '│  '))
      })
      return result
    }

    // Log BEFORE state
    const nodeId = isPaneChild(node) ? node.paneId : node.paneGroupId
    const nodeType = isPaneChild(node) ? 'Pane' : 'Group'
    console.log('\n=== REMOVE NODE OPERATION START ===')
    console.log(`Target ${nodeType.toLowerCase()}:`, nodeId)
    console.log('\nBEFORE - Parent group tree:')
    console.log(`Group: ${parent.id} [${parent.direction}]`)
    parent.children.forEach((child, i) => {
      const isLast = i === parent.children.length - 1
      console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
    })

    const beforeChildren = cloneValue(parent.children)
    parent.children = parent.children.filter((child) => paneNodeId(child) !== paneNodeId(node))
    this.reconcileActiveChildAfterRemoval(parent, paneNodeId(node))
    this.emitChildrenChanged(parent, beforeChildren)

    // Collapse horizontal/vertical groups with only one child (but keep stacked groups)
    if (parent.children.length === 1 && parent.direction !== 'stacked') {
      const session = this.getSessionRequired(parent.sessionId)
      const isRootGroup = session.rootPaneGroupId === parent.id
      const grandparent = this.findParentOfNode({ kind: 'group', paneGroupId: parent.id })
      
      if (isRootGroup) {
        // Special case: root group with single child - promote child to be new root
        const singleChild = parent.children[0]
        
        if (singleChild.kind === 'group') {
          // Promote the child group to be the new root
          this.updateSession(session.id, { rootPaneGroupId: singleChild.paneGroupId })
          
          // Remove the old root group
          this.state.paneGroups.delete(parent.id)
          this.emit({
            type: 'paneGroup.removed',
            entityType: 'paneGroup',
            entityId: parent.id,
            projectId: this.getSessionProjectId(parent.sessionId),
            sessionId: parent.sessionId,
            paneGroupId: parent.id,
            before: cloneValue(parent)
          })
          
          // Log collapsed state
          const promotedGroup = this.state.paneGroups.get(singleChild.paneGroupId)!
          console.log('\nAFTER - Collapsed root group (child promoted to root):')
          console.log(`Group: ${singleChild.paneGroupId} [${promotedGroup.direction}] (root)`)
          promotedGroup.children.forEach((child, i) => {
            const isLast = i === promotedGroup.children.length - 1
            console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
          })
          console.log('=== REMOVE NODE OPERATION END ===\n')
        } else {
          // Cannot promote a pane to root - keep the root group
          console.log('\nAFTER - Updated parent group tree (cannot promote pane to root):')
          console.log(`Group: ${parent.id} [${parent.direction}] (root)`)
          console.log(renderTree(singleChild, '   ').replace('├─', '└─'))
          console.log('=== REMOVE NODE OPERATION END ===\n')
        }
      } else if (grandparent) {
        const singleChild = parent.children[0]
        const parentIndex = grandparent.children.findIndex(
          (child) => !isPaneChild(child) && child.paneGroupId === parent.id
        )
        
        // Replace parent group with its single child in grandparent
        const grandparentBefore = cloneValue(grandparent.children)
        grandparent.children = grandparent.children.filter(
          (child) => !(child.kind === 'group' && child.paneGroupId === parent.id)
        )
        grandparent.children = this.insertChild(grandparent.children, singleChild, parentIndex)
        
        // If grandparent is stacked and the removed group was active, update to the promoted child
        if (grandparent.direction === 'stacked' && grandparent.activeChildId === parent.id) {
          grandparent.activeChildId = paneNodeId(singleChild)
        }
        
        this.emitChildrenChanged(grandparent, grandparentBefore)
        
        // Remove the now-empty parent group
        this.state.paneGroups.delete(parent.id)
        this.emit({
          type: 'paneGroup.removed',
          entityType: 'paneGroup',
          entityId: parent.id,
          projectId: this.getSessionProjectId(parent.sessionId),
          sessionId: parent.sessionId,
          paneGroupId: parent.id,
          before: cloneValue(parent)
        })

        // Log collapsed state
        console.log('\nAFTER - Collapsed (single child promoted):')
        if (singleChild.kind === 'pane') {
          const p = this.state.panes.get(singleChild.paneId)
          console.log(`Pane: ${singleChild.paneId} (${p?.preferredSizePct ?? 0}%)`)
        } else {
          const g = this.state.paneGroups.get(singleChild.paneGroupId)
          console.log(`Group: ${singleChild.paneGroupId} [${g?.direction}] (${g?.preferredSizePct ?? 0}%)`)
        }
        console.log('=== REMOVE NODE OPERATION END ===\n')
      } else {
        // Log normal AFTER state
        console.log('\nAFTER - Updated parent group tree:')
        console.log(`Group: ${parent.id} [${parent.direction}]`)
        parent.children.forEach((child, i) => {
          const isLast = i === parent.children.length - 1
          console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
        })
        console.log('=== REMOVE NODE OPERATION END ===\n')
      }
    } else {
      // Log normal AFTER state
      console.log('\nAFTER - Updated parent group tree:')
      console.log(`Group: ${parent.id} [${parent.direction}]`)
      if (parent.children.length === 0) {
        console.log('   (empty - no children)')
      } else {
        parent.children.forEach((child, i) => {
          const isLast = i === parent.children.length - 1
          console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
        })
      }
      console.log('=== REMOVE NODE OPERATION END ===\n')
    }

    if (isPaneChild(node)) {
      this.removePane(node.paneId)
      return
    }

    this.removePaneGroupRecursive(node.paneGroupId)
  }

  createPane(input: CreatePaneInput): Pane {
    this.getSessionRequired(input.sessionId)
    const pane: Pane = {
      id: input.id ?? this.generateId('pane'),
      sessionId: input.sessionId,
      type: input.type,
      preferredSizePct: input.preferredSizePct,
      state: cloneValue(input.state ?? {})
    }

    if (this.state.panes.has(pane.id)) {
      throw new Error(`Pane "${pane.id}" already exists.`)
    }

    this.state.panes.set(pane.id, pane)
    this.emit({
      type: 'pane.created',
      entityType: 'pane',
      entityId: pane.id,
      projectId: this.getSessionProjectId(pane.sessionId),
      sessionId: pane.sessionId,
      after: cloneValue(pane)
    })

    if (input.parentPaneGroupId) {
      this.insertPane(input.parentPaneGroupId, pane.id, input.index)
    }

    return cloneValue(pane)
  }

  splitPane(paneId: string, direction: 'horizontal' | 'vertical'): PaneGroup {
    const pane = this.getPaneRequired(paneId)
    const parentGroup = this.findParentOfNode({ kind: 'pane', paneId })
    if (!parentGroup) throw new Error('Pane is not attached to a pane group.')

    const paneIndex = parentGroup.children.findIndex((child) => isPaneChild(child) && child.paneId === paneId)
    if (paneIndex === -1) throw new Error('Pane is not attached to its parent pane group.')

    // Helper to render tree structure
    const renderTree = (node: PaneGroupChild, indent = ''): string => {
      if (node.kind === 'pane') {
        const p = this.state.panes.get(node.paneId)
        return `${indent}├─ Pane: ${node.paneId} (${p?.preferredSizePct ?? 0}%)`
      }
      const g = this.state.paneGroups.get(node.paneGroupId)
      if (!g) return `${indent}├─ Group: ${node.paneGroupId} (not found)`
      let result = `${indent}├─ Group: ${node.paneGroupId} [${g.direction}] (${g.preferredSizePct ?? 0}%)`
      g.children.forEach((child, i) => {
        const isLast = i === g.children.length - 1
        result += '\n' + renderTree(child, indent + (isLast ? '   ' : '│  '))
      })
      return result
    }

    // Log BEFORE state
    console.log('\n=== SPLIT OPERATION START ===')
    console.log('Split direction:', direction)
    console.log('Target pane:', paneId, `(${pane.preferredSizePct}%)`)
    console.log('\nBEFORE - Parent group tree:')
    console.log(`Group: ${parentGroup.id} [${parentGroup.direction}]`)
    parentGroup.children.forEach((child, i) => {
      const isLast = i === parentGroup.children.length - 1
      console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
    })

    // Special case: if parent is stacked, create a new split group with both panes
    if (parentGroup.direction === 'stacked') {
      console.log('Strategy: Create new split group (parent is stacked)')
      
      const newGroup = this.createPaneGroup({
        sessionId: pane.sessionId,
        name: (pane.state as any)?.title || '',
        direction,
        parentPaneGroupId: parentGroup.id,
        index: paneIndex
      })

      if (parentGroup.activeChildId === paneId) {
        this.updatePaneGroup(parentGroup.id, { activeChildId: newGroup.id })
      }

      this.moveNode({ kind: 'pane', paneId }, newGroup.id)
      this.updatePane(paneId, { preferredSizePct: 50 })
      this.createPane({
        sessionId: pane.sessionId,
        type: 'terminal',
        preferredSizePct: 50,
        state: { title: 'Terminal' },
        parentPaneGroupId: newGroup.id
      })

      const result = this.getPaneGroupRequired(newGroup.id)
      console.log('\nAFTER - New split group tree:')
      console.log(`Group: ${result.id} [${result.direction}]`)
      result.children.forEach((child, i) => {
        const isLast = i === result.children.length - 1
        console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
      })
      console.log('=== SPLIT OPERATION END ===\n')
      return result
    }

    // Check if parent group matches the split direction
    if (parentGroup.direction === direction) {
      console.log('Strategy: Add to existing group (direction matches)')
      
      // Add new pane directly to the existing group, right after current pane
      this.createPane({
        sessionId: pane.sessionId,
        type: 'terminal',
        preferredSizePct: 50,
        state: { title: 'Terminal' },
        parentPaneGroupId: parentGroup.id,
        index: paneIndex + 1
      })
      
      // Adjust size of current pane
      this.updatePane(paneId, { preferredSizePct: 50 })
      
      const result = this.getPaneGroupRequired(parentGroup.id)
      console.log('\nAFTER - Updated parent group tree:')
      console.log(`Group: ${result.id} [${result.direction}]`)
      result.children.forEach((child, i) => {
        const isLast = i === result.children.length - 1
        console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
      })
      console.log('=== SPLIT OPERATION END ===\n')
      return result
    }

    // Create new group if directions don't match
    console.log('Strategy: Create nested group (direction does not match)')
    
    const newGroup = this.createPaneGroup({
      sessionId: pane.sessionId,
      name: (pane.state as any)?.title || '',
      direction,
      parentPaneGroupId: parentGroup.id,
      index: paneIndex
    })

    this.moveNode({ kind: 'pane', paneId }, newGroup.id)
    this.updatePane(paneId, { preferredSizePct: 50 })
    this.createPane({
      sessionId: pane.sessionId,
      type: 'terminal',
      preferredSizePct: 50,
      state: { title: 'Terminal' },
      parentPaneGroupId: newGroup.id
    })

    const result = this.getPaneGroupRequired(newGroup.id)
    const updatedParent = this.getPaneGroupRequired(parentGroup.id)
    console.log('\nAFTER - Updated parent group tree (with new nested group):')
    console.log(`Group: ${updatedParent.id} [${updatedParent.direction}]`)
    updatedParent.children.forEach((child, i) => {
      const isLast = i === updatedParent.children.length - 1
      console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
    })
    console.log('=== SPLIT OPERATION END ===\n')
    return result
  }


  splitPaneGroup(
    paneGroupId: string,
    direction: Exclude<PaneGroupLayout, 'stacked'>,
    newChild?: PaneGroupChild
  ): PaneGroup {
    const paneGroup = this.getPaneGroupRequired(paneGroupId)
    const session = this.getSessionRequired(paneGroup.sessionId)
    
    // Helper to render tree structure
    const renderTree = (node: PaneGroupChild, indent = ''): string => {
      if (node.kind === 'pane') {
        const p = this.state.panes.get(node.paneId)
        return `${indent}├─ Pane: ${node.paneId} (${p?.preferredSizePct ?? 0}%)`
      }
      const g = this.state.paneGroups.get(node.paneGroupId)
      if (!g) return `${indent}├─ Group: ${node.paneGroupId} (not found)`
      let result = `${indent}├─ Group: ${node.paneGroupId} [${g.direction}] (${g.preferredSizePct ?? 0}%)`
      g.children.forEach((child, i) => {
        const isLast = i === g.children.length - 1
        result += '\n' + renderTree(child, indent + (isLast ? '   ' : '│  '))
      })
      return result
    }
    
    // Check if this is the root group BEFORE finding parent
    const isRootGroup = session.rootPaneGroupId === paneGroupId
    
    // Find parent group by searching all groups
    const parentGroup = this.findParentOfNode({ kind: 'group', paneGroupId })
    
    // Handle root pane group (no parent)
    if (isRootGroup) {
      // Log BEFORE state
      console.log('\n=== SPLIT PANE GROUP OPERATION START (ROOT) ===')
      console.log('Split direction:', direction)
      console.log('Target group:', paneGroupId, `[${paneGroup.direction}]`)
      console.log('New child:', newChild ? (newChild.kind === 'pane' ? `Pane: ${newChild.paneId}` : `Group: ${newChild.paneGroupId}`) : 'New terminal pane')
      console.log('\nBEFORE - Root group tree:')
      console.log(`Group: ${paneGroup.id} [${paneGroup.direction}] (root)`)
      paneGroup.children.forEach((child, i) => {
        const isLast = i === paneGroup.children.length - 1
        console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
      })
      console.log('Strategy: Create new root group with split direction')

      // Create new root group with split direction
      const newRootGroup = this.createPaneGroup({
        sessionId: paneGroup.sessionId,
        name: paneGroup.name,
        direction
      })

      // Set as new root first (this detaches the old root)
      this.updateSession(session.id, { rootPaneGroupId: newRootGroup.id })

      // Get the actual stored group (not the cloned return value)
      const storedNewRootGroup = this.state.paneGroups.get(newRootGroup.id)!

      // Now manually add old root as child (bypass insertPaneGroup validation)
      storedNewRootGroup.children.push({ kind: 'group', paneGroupId })
      
      // Add new child as second child
      if (newChild) {
        if (newChild.kind === 'pane') {
          // Verify pane exists
          this.getPaneRequired(newChild.paneId)
          // Remove from current parent if attached (manually, not via removeNode which deletes orphans)
          const currentParent = this.findParentOfNode(newChild)
          if (currentParent) {
            const index = currentParent.children.findIndex(
              child => child.kind === 'pane' && child.paneId === newChild.paneId
            )
            if (index !== -1) {
              currentParent.children.splice(index, 1)
            }
          }
          storedNewRootGroup.children.push(newChild)
        } else {
          // Verify group exists
          this.getPaneGroupRequired(newChild.paneGroupId)
          // Remove from current parent if attached (manually, not via removeNode which deletes orphans)
          const currentParent = this.findParentOfNode(newChild)
          if (currentParent) {
            const index = currentParent.children.findIndex(
              child => child.kind === 'group' && child.paneGroupId === newChild.paneGroupId
            )
            if (index !== -1) {
              currentParent.children.splice(index, 1)
            }
          }
          storedNewRootGroup.children.push(newChild)
        }
      } else {
        // Create new terminal pane without parent, then manually add
        const newPane = this.createPane({
          sessionId: paneGroup.sessionId,
          type: 'terminal',
          state: { title: 'Terminal' }
        })
        storedNewRootGroup.children.push({ kind: 'pane', paneId: newPane.id })
      }

      // Set preferredSizePct on both children directly on stored objects
      const storedOldRoot = this.state.paneGroups.get(paneGroupId)!
      storedOldRoot.preferredSizePct = 50
      
      const secondChild = storedNewRootGroup.children[1]
      if (secondChild.kind === 'pane') {
        const storedPane = this.state.panes.get(secondChild.paneId)!
        storedPane.preferredSizePct = 50
      } else {
        const storedGroup = this.state.paneGroups.get(secondChild.paneGroupId)!
        storedGroup.preferredSizePct = 50
      }

      // Emit single comprehensive event for new root group with complete structure
      this.emit({
        type: 'paneGroup.updated',
        entityType: 'paneGroup',
        entityId: newRootGroup.id,
        projectId: this.getSessionProjectId(paneGroup.sessionId),
        sessionId: paneGroup.sessionId,
        paneGroupId: newRootGroup.id,
        before: { ...cloneValue(storedNewRootGroup), children: [] },
        after: cloneValue(storedNewRootGroup)
      })

      // Log AFTER state
      const result = this.getPaneGroupRequired(newRootGroup.id)
      console.log('\nAFTER - New root group tree:')
      console.log(`Group: ${result.id} [${result.direction}] (root)`)
      result.children.forEach((child, i) => {
        const isLast = i === result.children.length - 1
        console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
      })
      console.log('=== SPLIT PANE GROUP OPERATION END (ROOT) ===\n')

      return result
    }

    // Handle nested pane group
    if (!parentGroup) {
      throw new Error('Pane group is not attached to a parent pane group.')
    }

    const paneGroupIndex = parentGroup.children.findIndex(
      (child) => child.kind === 'group' && child.paneGroupId === paneGroupId
    )
    if (paneGroupIndex === -1) {
      throw new Error('Pane group is not attached to its parent pane group.')
    }

    // Log BEFORE state
    console.log('\n=== SPLIT PANE GROUP OPERATION START (NESTED) ===')
    console.log('Split direction:', direction)
    console.log('Target group:', paneGroupId, `[${paneGroup.direction}] (${paneGroup.preferredSizePct ?? 0}%)`)
    console.log('New child:', newChild ? (newChild.kind === 'pane' ? `Pane: ${newChild.paneId}` : `Group: ${newChild.paneGroupId}`) : 'New terminal pane')
    console.log('\nBEFORE - Parent group tree:')
    console.log(`Group: ${parentGroup.id} [${parentGroup.direction}]`)
    parentGroup.children.forEach((child, i) => {
      const isLast = i === parentGroup.children.length - 1
      console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
    })
    console.log('Strategy: Create new parent group with split direction')

    // Create new parent group with split direction
    const newParentGroup = this.createPaneGroup({
      sessionId: paneGroup.sessionId,
      name: paneGroup.name,
      direction,
      parentPaneGroupId: parentGroup.id,
      index: paneGroupIndex
    })

    // Move the pane group into new parent
    this.moveNode({ kind: 'group', paneGroupId }, newParentGroup.id, 0)
    this.updatePaneGroup(paneGroupId, { preferredSizePct: 50 })

    // Add new child as second child
    if (newChild) {
      // Move the child (handles both attached and detached cases)
      this.moveNode(newChild, newParentGroup.id, 1)
      if (newChild.kind === 'pane') {
        this.updatePane(newChild.paneId, { preferredSizePct: 50 })
      } else {
        this.updatePaneGroup(newChild.paneGroupId, { preferredSizePct: 50 })
      }
    } else {
      // Create new terminal pane as default
      this.createPane({
        sessionId: paneGroup.sessionId,
        type: 'terminal',
        state: { title: 'Terminal' },
        parentPaneGroupId: newParentGroup.id,
        preferredSizePct: 50
      })
    }

    // Log AFTER state
    const result = this.getPaneGroupRequired(newParentGroup.id)
    console.log('\nAFTER - New parent group tree:')
    console.log(`Group: ${result.id} [${result.direction}] (${result.preferredSizePct ?? 0}%)`)
    result.children.forEach((child, i) => {
      const isLast = i === result.children.length - 1
      console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
    })
    console.log('=== SPLIT PANE GROUP OPERATION END (NESTED) ===\n')

    return result
  }


  convertPaneToTabs(paneId: string): PaneGroup {
    const pane = this.getPaneRequired(paneId)
    const parentGroup = this.findParentOfNode({ kind: 'pane', paneId })
    if (!parentGroup) throw new Error('Pane is not attached to a pane group.')

    const paneIndex = parentGroup.children.findIndex((child) => isPaneChild(child) && child.paneId === paneId)
    if (paneIndex === -1) throw new Error('Pane is not attached to its parent pane group.')

    // Helper to render tree structure (reused from splitPane)
    const renderTree = (node: PaneGroupChild, indent = ''): string => {
      if (node.kind === 'pane') {
        const p = this.state.panes.get(node.paneId)
        return `${indent}├─ Pane: ${node.paneId} (${p?.preferredSizePct ?? 0}%)`
      }
      const g = this.state.paneGroups.get(node.paneGroupId)
      if (!g) return `${indent}├─ Group: ${node.paneGroupId} (not found)`
      let result = `${indent}├─ Group: ${node.paneGroupId} [${g.direction}] (${g.preferredSizePct ?? 0}%)`
      g.children.forEach((child, i) => {
        const isLast = i === g.children.length - 1
        result += '\n' + renderTree(child, indent + (isLast ? '   ' : '│  '))
      })
      return result
    }

    // Log BEFORE state
    console.log('\n=== CONVERT TO TABS OPERATION START ===')
    console.log('Target pane:', paneId, `(${pane.preferredSizePct}%)`)
    console.log('\nBEFORE - Parent group tree:')
    console.log(`Group: ${parentGroup.id} [${parentGroup.direction}]`)
    parentGroup.children.forEach((child, i) => {
      const isLast = i === parentGroup.children.length - 1
      console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
    })

    // Special case: if parent is already stacked, just add a new tab to it
    if (parentGroup.direction === 'stacked') {
      console.log('Strategy: Add new tab to existing stacked group')
      
      // Create a new pane as a sibling tab in the same stacked group
      const newPane = this.createPane({
        sessionId: pane.sessionId,
        type: 'terminal',
        state: { title: 'Terminal' },
        parentPaneGroupId: parentGroup.id,
        index: paneIndex + 1
      })
      
      // Set the new pane as active
      this.updatePaneGroup(parentGroup.id, { activeChildId: newPane.id })

      const updatedParent = this.getPaneGroupRequired(parentGroup.id)
      console.log('\nAFTER - Updated parent group tree (new tab added):')
      console.log(`Group: ${updatedParent.id} [${updatedParent.direction}]`)
      updatedParent.children.forEach((child, i) => {
        const isLast = i === updatedParent.children.length - 1
        console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
      })
      console.log('=== CONVERT TO TABS OPERATION END ===\n')
      return updatedParent
    }

    // Create new stacked group (inherit size from the pane being converted)
    const newGroup = this.createPaneGroup({
      sessionId: pane.sessionId,
      name: (pane.state as any)?.title || '',
      direction: 'stacked',
      preferredSizePct: pane.preferredSizePct,
      parentPaneGroupId: parentGroup.id,
      index: paneIndex
    })

    // Move original pane into new stacked group
    this.moveNode({ kind: 'pane', paneId }, newGroup.id)
    
    // Create a second pane as a new tab
    const newPane = this.createPane({
      sessionId: pane.sessionId,
      type: 'terminal',
      state: { title: 'Terminal' },
      parentPaneGroupId: newGroup.id
    })
    
    // Set the new pane as active in the stacked group
    this.updatePaneGroup(newGroup.id, { activeChildId: newPane.id })

    const result = this.getPaneGroupRequired(newGroup.id)
    const updatedParent = this.getPaneGroupRequired(parentGroup.id)
    console.log('\nAFTER - Updated parent group tree (with new stacked group):')
    console.log(`Group: ${updatedParent.id} [${updatedParent.direction}]`)
    updatedParent.children.forEach((child, i) => {
      const isLast = i === updatedParent.children.length - 1
      console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
    })
    console.log('=== CONVERT TO TABS OPERATION END ===\n')
    return result
  }


  updatePane(paneId: string, input: UpdatePaneInput): Pane {
    const pane = this.getPaneRequired(paneId)
    const before = cloneValue(pane)
    pane.type = input.type ?? pane.type
    pane.preferredSizePct = input.preferredSizePct ?? pane.preferredSizePct
    if (input.state) pane.state = cloneValue(input.state)

    this.emit({
      type: 'pane.updated',
      entityType: 'pane',
      entityId: pane.id,
      projectId: this.getSessionProjectId(pane.sessionId),
      sessionId: pane.sessionId,
      before,
      after: cloneValue(pane)
    })
    return cloneValue(pane)
  }

  removePane(paneId: string): void {
    const pane = this.getPaneRequired(paneId)
    const parent = this.findParentOfNode({ kind: 'pane', paneId })
    
    // Helper to render tree structure
    const renderTree = (node: PaneGroupChild, indent = ''): string => {
      if (node.kind === 'pane') {
        const p = this.state.panes.get(node.paneId)
        return `${indent}├─ Pane: ${node.paneId} (${p?.preferredSizePct ?? 0}%)`
      }
      const g = this.state.paneGroups.get(node.paneGroupId)
      if (!g) return `${indent}├─ Group: ${node.paneGroupId} (not found)`
      let result = `${indent}├─ Group: ${node.paneGroupId} [${g.direction}] (${g.preferredSizePct ?? 0}%)`
      g.children.forEach((child, i) => {
        const isLast = i === g.children.length - 1
        result += '\n' + renderTree(child, indent + (isLast ? '   ' : '│  '))
      })
      return result
    }

    if (parent) {
      // Log BEFORE state
      console.log('\n=== REMOVE PANE OPERATION START ===')
      console.log('Target pane:', paneId, `(${pane.preferredSizePct ?? 0}%)`)
      console.log('\nBEFORE - Parent group tree:')
      console.log(`Group: ${parent.id} [${parent.direction}]`)
      parent.children.forEach((child, i) => {
        const isLast = i === parent.children.length - 1
        console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
      })

      const beforeChildren = cloneValue(parent.children)
      parent.children = parent.children.filter((child) => !(isPaneChild(child) && child.paneId === paneId))
      this.reconcileActiveChildAfterRemoval(parent, paneId)
      this.emitChildrenChanged(parent, beforeChildren)

      // Collapse horizontal/vertical groups with only one child (but keep stacked groups)
      if (parent.children.length === 1 && parent.direction !== 'stacked') {
        const grandparent = this.findParentOfNode({ kind: 'group', paneGroupId: parent.id })
        if (grandparent) {
          const singleChild = parent.children[0]
          const parentIndex = grandparent.children.findIndex(
            (child) => !isPaneChild(child) && child.paneGroupId === parent.id
          )
          
          // Replace parent group with its single child in grandparent
          const grandparentBefore = cloneValue(grandparent.children)
          grandparent.children = grandparent.children.filter(
            (child) => !(child.kind === 'group' && child.paneGroupId === parent.id)
          )
          grandparent.children = this.insertChild(grandparent.children, singleChild, parentIndex)
          
          // If grandparent is stacked and the removed group was active, update to the promoted child
          if (grandparent.direction === 'stacked' && grandparent.activeChildId === parent.id) {
            grandparent.activeChildId = paneNodeId(singleChild)
          }
          
          this.emitChildrenChanged(grandparent, grandparentBefore)
          
          // Remove the now-empty parent group
          this.state.paneGroups.delete(parent.id)
          this.emit({
            type: 'paneGroup.removed',
            entityType: 'paneGroup',
            entityId: parent.id,
            projectId: this.getSessionProjectId(parent.sessionId),
            sessionId: parent.sessionId,
            paneGroupId: parent.id,
            before: cloneValue(parent)
          })

          // Log collapsed state
          console.log('\nAFTER - Collapsed (single child promoted):')
          if (singleChild.kind === 'pane') {
            const p = this.state.panes.get(singleChild.paneId)
            console.log(`Pane: ${singleChild.paneId} (${p?.preferredSizePct ?? 0}%)`)
          } else {
            const g = this.state.paneGroups.get(singleChild.paneGroupId)
            console.log(`Group: ${singleChild.paneGroupId} [${g?.direction}] (${g?.preferredSizePct ?? 0}%)`)
          }
          console.log('=== REMOVE PANE OPERATION END ===\n')
        } else {
          // Log normal AFTER state
          console.log('\nAFTER - Updated parent group tree:')
          console.log(`Group: ${parent.id} [${parent.direction}]`)
          parent.children.forEach((child, i) => {
            const isLast = i === parent.children.length - 1
            console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
          })
          console.log('=== REMOVE PANE OPERATION END ===\n')
        }
      } else {
        // Log normal AFTER state
        console.log('\nAFTER - Updated parent group tree:')
        console.log(`Group: ${parent.id} [${parent.direction}]`)
        if (parent.children.length === 0) {
          console.log('   (empty - no children)')
        } else {
          parent.children.forEach((child, i) => {
            const isLast = i === parent.children.length - 1
            console.log(renderTree(child, isLast ? '   ' : '│  ').replace('├─', isLast ? '└─' : '├─'))
          })
        }
        console.log('=== REMOVE PANE OPERATION END ===\n')
      }
    }

    this.state.panes.delete(paneId)
    this.emit({
      type: 'pane.removed',
      entityType: 'pane',
      entityId: pane.id,
      projectId: this.getSessionProjectId(pane.sessionId),
      sessionId: pane.sessionId,
      before: cloneValue(pane)
    })
  }

  private emit(event: WorkspaceEvent): void {
    for (const listener of this.listeners) listener(cloneValue(event))
    const listeners = this.listenersByType.get(event.type)
    if (!listeners) return
    for (const listener of listeners) listener(cloneValue(event))
  }

  private emitChildrenChanged(
    paneGroup: PaneGroup,
    beforeChildren: PaneGroupChild[]
  ): void {
    this.emit({
      type: 'paneGroup.childrenChanged',
      entityType: 'paneGroup',
      entityId: paneGroup.id,
      projectId: this.getSessionProjectId(paneGroup.sessionId),
      sessionId: paneGroup.sessionId,
      paneGroupId: paneGroup.id,
      beforeChildren,
      afterChildren: cloneValue(paneGroup.children)
    })
  }

  private validateChildren(
    children: PaneGroupChild[],
    sessionId: string,
    paneGroupId: string
  ): void {
    const ids = new Set<string>()
    for (const child of children) {
      const id = paneNodeId(child)
      if (ids.has(id)) throw new Error('Pane group children cannot contain duplicates.')
      ids.add(id)

      if (isPaneChild(child)) {
        const pane = this.getPaneRequired(child.paneId)
        this.assertSameSession(pane.sessionId, sessionId)
        continue
      }

      const nested = this.getPaneGroupRequired(child.paneGroupId)
      const session = this.getSessionRequired(sessionId)
      if (session.rootPaneGroupId === nested.id) {
        throw new Error('A session root pane group cannot be nested under another pane group.')
      }
      this.assertSameSession(nested.sessionId, sessionId)
      if (nested.id === paneGroupId || this.isDescendant(nested.id, paneGroupId)) {
        throw new Error('Cannot create a pane group cycle.')
      }
    }
  }

  private removePaneGroupRecursive(paneGroupId: string): void {
    const paneGroup = this.getPaneGroupRequired(paneGroupId)
    for (const child of paneGroup.children) {
      if (isPaneChild(child)) {
        const pane = this.getPaneRequired(child.paneId)
        this.state.panes.delete(child.paneId)
        this.emit({
          type: 'pane.removed',
          entityType: 'pane',
          entityId: pane.id,
          projectId: this.getSessionProjectId(pane.sessionId),
          sessionId: pane.sessionId,
          before: cloneValue(pane)
        })
      } else {
        this.removePaneGroupRecursive(child.paneGroupId)
      }
    }

    this.state.paneGroups.delete(paneGroupId)
    this.emit({
      type: 'paneGroup.removed',
      entityType: 'paneGroup',
      entityId: paneGroup.id,
      projectId: this.getSessionProjectId(paneGroup.sessionId),
      sessionId: paneGroup.sessionId,
      paneGroupId: paneGroup.id,
      before: cloneValue(paneGroup)
    })
  }

  private insertChild(
    children: PaneGroupChild[],
    child: PaneGroupChild,
    index?: number
  ): PaneGroupChild[] {
    const next = cloneValue(children)
    const targetIndex = index === undefined ? next.length : index
    if (targetIndex < 0 || targetIndex > next.length) {
      throw new Error('Child index is out of bounds.')
    }

    next.splice(targetIndex, 0, child)
    return next
  }

  private findParentOfNode(node: PaneGroupChild): PaneGroup | null {
    for (const paneGroup of this.state.paneGroups.values()) {
      if (paneGroup.children.some((child) => child.kind === node.kind && paneNodeId(child) === paneNodeId(node))) {
        return paneGroup
      }
    }

    return null
  }

  private isDescendant(candidateAncestorId: string, targetId: string): boolean {
    const ancestor = this.getPaneGroupRequired(candidateAncestorId)
    for (const child of ancestor.children) {
      if (!isPaneChild(child)) {
        if (child.paneGroupId === targetId) return true
        if (this.isDescendant(child.paneGroupId, targetId)) return true
      }
    }

    return false
  }

  private assertSameSession(leftSessionId: string, rightSessionId: string): void {
    if (leftSessionId !== rightSessionId) {
      throw new Error('Pane tree operations cannot cross session boundaries.')
    }
  }

  private getSessionProjectId(sessionId: string): string {
    return this.getSessionRequired(sessionId).projectId
  }

  private getNextActiveSessionId(removedSession: Session): string | undefined {
    const sameProjectSessionId = removedSession.projectId
      ? this.getProjectRequired(removedSession.projectId).sessionIds.find((id) => id !== removedSession.id)
      : undefined

    if (sameProjectSessionId) return sameProjectSessionId

    return Array.from(this.state.sessions.values()).find((session) => session.id !== removedSession.id)?.id
  }

  private getProjectRequired(projectId: string): Project {
    const project = this.state.projects.get(projectId)
    if (!project) throw new Error(`Project "${projectId}" was not found.`)
    return project
  }

  private getSessionRequired(sessionId: string): Session {
    const session = this.state.sessions.get(sessionId)
    if (!session) throw new Error(`Session "${sessionId}" was not found.`)
    return session
  }

  private getPaneGroupRequired(paneGroupId: string): PaneGroup {
    const paneGroup = this.state.paneGroups.get(paneGroupId)
    if (!paneGroup) throw new Error(`Pane group "${paneGroupId}" was not found.`)
    return paneGroup
  }

  private getPaneRequired(paneId: string): Pane {
    const pane = this.state.panes.get(paneId)
    if (!pane) throw new Error(`Pane "${paneId}" was not found.`)
    return pane
  }

  private cloneOrNull<T>(value: T | undefined): T | null {
    return value ? cloneValue(value) : null
  }

  private ensureStackedGroupHasActiveChild(paneGroup: PaneGroup): void {
    if (paneGroup.direction !== 'stacked' || paneGroup.activeChildId) return
    paneGroup.activeChildId = paneGroup.children[0] ? paneNodeId(paneGroup.children[0]) : undefined
  }

  private reconcileActiveChildAfterRemoval(paneGroup: PaneGroup, removedChildId: string): void {
    if (paneGroup.direction !== 'stacked' || paneGroup.activeChildId !== removedChildId) return
    paneGroup.activeChildId = paneGroup.children[0] ? paneNodeId(paneGroup.children[0]) : undefined
  }

  private normalizeStackedGroupActiveChild(paneGroup: PaneGroup): void {
    if (paneGroup.direction !== 'stacked') return
    if (!paneGroup.activeChildId) {
      this.ensureStackedGroupHasActiveChild(paneGroup)
      return
    }

    if (!paneGroup.children.some((child) => paneNodeId(child) === paneGroup.activeChildId)) {
      paneGroup.activeChildId = paneGroup.children[0] ? paneNodeId(paneGroup.children[0]) : undefined
    }
  }

  private loadState(workspaceFilePath: string): boolean {
    try {
      const raw = fs.readFileSync(workspaceFilePath, 'utf-8')
      const workspace = JSON.parse(raw) as PersistedWorkspace
      if (workspace.version !== 1) return false

      for (const { id, folder } of workspace.projects) {
        const stateFilePath = path.join(folder, '.sessionry', 'state.json')
        try {
          const stateRaw = fs.readFileSync(stateFilePath, 'utf-8')
          const projectState = JSON.parse(stateRaw) as PersistedProjectState
          if (projectState.version !== 1 || projectState.project.id !== id) continue

          this.state.projects.set(projectState.project.id, cloneValue(projectState.project))
          this.state.projectOrder.push(projectState.project.id)
          for (const session of projectState.sessions) {
            this.state.sessions.set(session.id, cloneValue(session))
          }
          for (const paneGroup of projectState.paneGroups) {
            this.state.paneGroups.set(paneGroup.id, cloneValue(paneGroup))
          }
          for (const pane of projectState.panes) {
            this.state.panes.set(pane.id, cloneValue(pane))
          }
        } catch {
          // Skip projects whose state file is missing or unreadable.
        }
      }

      this.state.activeSessionId = workspace.activeSessionId

      // Advance nextId past any existing numeric IDs to avoid conflicts.
      for (const id of [
        ...Array.from(this.state.projects.keys()),
        ...Array.from(this.state.sessions.keys()),
        ...Array.from(this.state.paneGroups.keys()),
        ...Array.from(this.state.panes.keys())
      ]) {
        const match = id.match(/(\d+)$/)
        if (match) {
          const n = parseInt(match[1], 10)
          if (n >= this.nextId) this.nextId = n + 1
        }
      }

      return true
    } catch {
      return false
    }
  }

  private saveWorkspace(): void {
    if (!this.workspaceFilePath) return
    const data: PersistedWorkspace = {
      version: 1,
      activeSessionId: this.state.activeSessionId,
      projects: this.state.projectOrder.map((id) => {
        const project = this.state.projects.get(id)!
        return { id, folder: project.folder }
      })
    }
    this.writeJsonFile(this.workspaceFilePath, data)
  }

  private saveProjectState(projectId: string): void {
    const project = this.state.projects.get(projectId)
    if (!project?.folder) return

    const stateDir = path.join(project.folder, '.sessionry')
    const stateFilePath = path.join(stateDir, 'state.json')
    const settingsFilePath = path.join(stateDir, 'settings.json')

    const projectSessionIds = new Set(project.sessionIds)
    const sessions = Array.from(this.state.sessions.values())
      .filter((s) => projectSessionIds.has(s.id))
      .map(cloneValue)
    const paneGroups = Array.from(this.state.paneGroups.values())
      .filter((pg) => projectSessionIds.has(pg.sessionId))
      .map(cloneValue)
    const panes = Array.from(this.state.panes.values())
      .filter((p) => projectSessionIds.has(p.sessionId))
      .map(cloneValue)

    const data: PersistedProjectState = {
      version: 1,
      project: cloneValue(project),
      sessions,
      paneGroups,
      panes
    }

    try {
      fs.mkdirSync(stateDir, { recursive: true })
      this.writeJsonFile(stateFilePath, data)
      if (!fs.existsSync(settingsFilePath)) {
        this.writeJsonFile(settingsFilePath, { version: 1 })
      }
    } catch (err) {
      console.error(`[WorkspaceStore] Failed to save project state for "${projectId}":`, err)
    }
  }

  private writeJsonFile(filePath: string, data: unknown): void {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (err) {
      console.error(`[WorkspaceStore] Failed to write "${filePath}":`, err)
    }
  }

  private scheduleSave(opts: { workspace: boolean; projectId: string | null }): void {
    if (!this.workspaceFilePath) return
    if (opts.workspace) this.workspaceDirty = true
    if (opts.projectId) this.dirtyProjectIds.add(opts.projectId)

    if (this.saveTimer !== undefined) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined
      if (this.workspaceDirty) {
        this.saveWorkspace()
        this.workspaceDirty = false
      }
      for (const id of this.dirtyProjectIds) {
        this.saveProjectState(id)
      }
      this.dirtyProjectIds.clear()
    }, 500)
  }

  private determineSaveOpts(command: WorkspaceCommand): { workspace: boolean; projectId: string | null } {
    switch (command.type) {
      case 'project.create':
        // projectId filled in by executeCommand after execution
        return { workspace: true, projectId: null }
      case 'project.update':
        return { workspace: false, projectId: command.projectId }
      case 'project.remove':
        return { workspace: true, projectId: null }
      case 'session.create':
        return { workspace: false, projectId: command.input.projectId }
      case 'session.activate':
        return { workspace: true, projectId: null }
      case 'session.update':
      case 'session.setRootPaneGroup': {
        const session = this.state.sessions.get(command.sessionId)
        return { workspace: false, projectId: session?.projectId ?? null }
      }
      case 'session.remove': {
        const session = this.state.sessions.get(command.sessionId)
        return { workspace: false, projectId: session?.projectId ?? null }
      }
      case 'paneGroup.create':
        return { workspace: false, projectId: this.sessionProjectId(command.input.sessionId) }
      case 'paneGroup.update': {
        const pg = this.state.paneGroups.get(command.paneGroupId)
        return { workspace: false, projectId: pg ? this.sessionProjectId(pg.sessionId) : null }
      }
      case 'paneGroup.setChildren': {
        const pg = this.state.paneGroups.get(command.paneGroupId)
        return { workspace: false, projectId: pg ? this.sessionProjectId(pg.sessionId) : null }
      }
      case 'paneGroup.insertPane': {
        const pg = this.state.paneGroups.get(command.paneGroupId)
        return { workspace: false, projectId: pg ? this.sessionProjectId(pg.sessionId) : null }
      }
      case 'paneGroup.insertPaneGroup': {
        const pg = this.state.paneGroups.get(command.paneGroupId)
        return { workspace: false, projectId: pg ? this.sessionProjectId(pg.sessionId) : null }
      }
      case 'paneNode.move': {
        const pg = this.state.paneGroups.get(command.targetPaneGroupId)
        return { workspace: false, projectId: pg ? this.sessionProjectId(pg.sessionId) : null }
      }
      case 'paneNode.remove': {
        if (command.node.kind === 'pane') {
          const pane = this.state.panes.get(command.node.paneId)
          return { workspace: false, projectId: pane ? this.sessionProjectId(pane.sessionId) : null }
        }
        const pg = this.state.paneGroups.get(command.node.paneGroupId)
        return { workspace: false, projectId: pg ? this.sessionProjectId(pg.sessionId) : null }
      }
      case 'pane.create':
        return { workspace: false, projectId: this.sessionProjectId(command.input.sessionId) }
      case 'pane.split': {
        const pane = this.state.panes.get(command.paneId)
        return { workspace: false, projectId: pane ? this.sessionProjectId(pane.sessionId) : null }
      }
      case 'pane.convertToTabs': {
        const pane = this.state.panes.get(command.paneId)
        return { workspace: false, projectId: pane ? this.sessionProjectId(pane.sessionId) : null }
      }
      case 'pane.update': {
        const pane = this.state.panes.get(command.paneId)
        return { workspace: false, projectId: pane ? this.sessionProjectId(pane.sessionId) : null }
      }
      case 'pane.remove': {
        const pane = this.state.panes.get(command.paneId)
        return { workspace: false, projectId: pane ? this.sessionProjectId(pane.sessionId) : null }
      }
      default:
        return { workspace: false, projectId: null }
    }
  }

  private sessionProjectId(sessionId: string): string | null {
    return this.state.sessions.get(sessionId)?.projectId ?? null
  }

  private seedInitialState(): void {
    const project = this.createProject({
      id: 'project-primary',
      name: 'Primary Project',
      folder: process.cwd(),
      metadata: {},
      activeViews: {}
    })
    const session = this.createSession({
      id: 'session-primary',
      projectId: project.id,
      name: 'Primary Session',
      folder: process.cwd(),
      rootPaneGroupId: 'pane-group-root'
    })
    this.updatePaneGroup('pane-group-root', {
      name: 'Workspace',
      direction: 'horizontal',
      preferredSizePct: 100
    })

    const leftTabs = this.createPaneGroup({
      id: 'pane-group-left-tabs',
      sessionId: session.id,
      name: 'Editors',
      direction: 'stacked',
      preferredSizePct: 58,
      parentPaneGroupId: 'pane-group-root'
    })

    const rightColumn = this.createPaneGroup({
      id: 'pane-group-right-column',
      sessionId: session.id,
      name: 'Side Column',
      direction: 'vertical',
      preferredSizePct: 42,
      parentPaneGroupId: 'pane-group-root'
    })

    this.createPane({
      id: 'pane-terminal-primary',
      sessionId: session.id,
      type: 'terminal',
      preferredSizePct: 50,
      state: { title: 'Terminal', description: 'Primary terminal surface' },
      parentPaneGroupId: leftTabs.id
    })
    this.createPane({
      id: 'pane-activity',
      sessionId: session.id,
      type: 'activity',
      preferredSizePct: 50,
      state: { title: 'Activity', description: 'Build logs and recent events' },
      parentPaneGroupId: leftTabs.id
    })

    this.createPane({
      id: 'pane-outline',
      sessionId: session.id,
      type: 'outline',
      preferredSizePct: 45,
      state: { title: 'Outline', description: 'Project structure and symbols' },
      parentPaneGroupId: rightColumn.id
    })

    const bottomTabs = this.createPaneGroup({
      id: 'pane-group-bottom-tabs',
      sessionId: session.id,
      name: 'Inspectors',
      direction: 'stacked',
      preferredSizePct: 55,
      parentPaneGroupId: rightColumn.id
    })

    this.createPane({
      id: 'pane-inspector',
      sessionId: session.id,
      type: 'inspector',
      preferredSizePct: 60,
      state: { title: 'Inspector', description: 'Selected node details and metadata' },
      parentPaneGroupId: bottomTabs.id
    })
    this.createPane({
      id: 'pane-problems',
      sessionId: session.id,
      type: 'problems',
      preferredSizePct: 40,
      state: { title: 'Problems', description: 'Diagnostics, warnings, and tasks' },
      parentPaneGroupId: bottomTabs.id
    })

    const secondarySession = this.createSession({
      id: 'session-secondary',
      projectId: project.id,
      name: 'Secondary Session',
      folder: process.cwd(),
      rootPaneGroupId: 'pane-group-secondary-root'
    })

    this.updatePaneGroup('pane-group-secondary-root', {
      name: 'Secondary Workspace',
      direction: 'stacked',
      preferredSizePct: 100
    })

    this.createPane({
      id: 'pane-terminal-secondary',
      sessionId: secondarySession.id,
      type: 'terminal',
      preferredSizePct: 100,
      state: { title: 'Secondary Terminal', description: 'Alternate terminal surface for session switching' },
      parentPaneGroupId: 'pane-group-secondary-root'
    })

    this.state.activeSessionId = session.id
  }

  private generateId(prefix: string): string {
    const id = `${prefix}-${this.nextId}`
    this.nextId += 1
    return id
  }

  private assertNever(value: never): never {
    throw new Error(`Unsupported mutation: ${JSON.stringify(value)}`)
  }
}
