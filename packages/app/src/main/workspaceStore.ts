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
  Project,
  Session,
  Unsubscribe,
  UpdatePaneGroupInput,
  UpdatePaneInput,
  UpdateProjectInput,
  UpdateSessionInput
} from '@sessionry/plugin-api'

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

  constructor() {
    this.seedInitialState()
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
    switch (command.type) {
      case 'project.create':
        return { entityId: this.createProject(command.input).id }
      case 'project.update':
        return { entityId: this.updateProject(command.projectId, command.input).id }
      case 'project.remove':
        this.removeProject(command.projectId)
        return { entityId: command.projectId }
      case 'session.create':
        return { entityId: this.createSession(command.input).id }
      case 'session.activate':
        return { entityId: this.activateSession(command.sessionId).id }
      case 'session.update':
        return { entityId: this.updateSession(command.sessionId, command.input).id }
      case 'session.remove':
        this.removeSession(command.sessionId)
        return { entityId: command.sessionId }
      case 'session.setRootPaneGroup':
        return {
          entityId: this.setSessionRootPaneGroup(
            command.sessionId,
            command.rootPaneGroupId
          ).id
        }
      case 'paneGroup.create':
        return { entityId: this.createPaneGroup(command.input).id }
      case 'paneGroup.update':
        return {
          entityId: this.updatePaneGroup(command.paneGroupId, command.input).id
        }
      case 'paneGroup.setChildren':
        return {
          entityId: this.setPaneGroupChildren(command.paneGroupId, command.children).id
        }
      case 'paneGroup.insertPane':
        return {
          entityId: this.insertPane(command.paneGroupId, command.paneId, command.index).id
        }
      case 'paneGroup.insertPaneGroup':
        return {
          entityId: this.insertPaneGroup(
            command.paneGroupId,
            command.childPaneGroupId,
            command.index
          ).id
        }
      case 'paneNode.move':
        return {
          entityId: this.moveNode(command.node, command.targetPaneGroupId, command.index).id
        }
      case 'paneNode.remove':
        this.removeNode(command.node)
        return { entityId: paneNodeId(command.node) }
      case 'pane.create':
        return { entityId: this.createPane(command.input).id }
      case 'pane.split':
        return { entityId: this.splitPane(command.paneId, command.direction).id }
      case 'pane.update':
        return { entityId: this.updatePane(command.paneId, command.input).id }
      case 'pane.remove':
        this.removePane(command.paneId)
        return { entityId: command.paneId }
      default:
        return this.assertNever(command)
    }
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
    const beforeChildren = cloneValue(parent.children)
    parent.children = parent.children.filter((child) => paneNodeId(child) !== paneNodeId(node))
    this.reconcileActiveChildAfterRemoval(parent, paneNodeId(node))
    this.emitChildrenChanged(parent, beforeChildren)

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

    const newGroup = this.createPaneGroup({
      sessionId: pane.sessionId,
      name: '',
      direction,
      parentPaneGroupId: parentGroup.id,
      index: paneIndex
    })

    if (parentGroup.direction === 'stacked' && parentGroup.activeChildId === paneId) {
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

    return this.getPaneGroupRequired(newGroup.id)
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
    if (parent) {
      const beforeChildren = cloneValue(parent.children)
      parent.children = parent.children.filter((child) => !(isPaneChild(child) && child.paneId === paneId))
      this.reconcileActiveChildAfterRemoval(parent, paneId)
      this.emitChildrenChanged(parent, beforeChildren)
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
