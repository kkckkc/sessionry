export type EntityMetadataValue = string | number | boolean | null
export type EntityMetadata = Record<string, EntityMetadataValue>

export type PaneGroupLayout = 'stacked' | 'horizontal' | 'vertical'
export type PaneType = 'terminal' | (string & {})

export interface Project {
  id: string
  name: string
  folder: string
  metadata: EntityMetadata
  sessionIds: string[]
}

export interface Session {
  id: string
  projectId: string
  name: string
  folder: string
  rootPaneGroupId: string
}

export interface PaneGroupChildPane {
  kind: 'pane'
  paneId: string
}

export interface PaneGroupChildGroup {
  kind: 'group'
  paneGroupId: string
}

export type PaneGroupChild = PaneGroupChildPane | PaneGroupChildGroup

export interface PaneGroup {
  id: string
  sessionId: string
  name: string
  direction: PaneGroupLayout
  children: PaneGroupChild[]
}

export interface Pane {
  id: string
  sessionId: string
  type: PaneType
  state: Record<string, unknown>
}

export type ProjectData = Project
export type SessionData = Session
export type PaneGroupData = PaneGroup
export type PaneData = Pane

export interface WorkspaceStateSnapshot {
  projects: Project[]
  sessions: Session[]
  paneGroups: PaneGroup[]
  panes: Pane[]
}

export type WorkspaceEntityType = 'project' | 'session' | 'paneGroup' | 'pane'

export type WorkspaceEventType =
  | 'project.created'
  | 'project.updated'
  | 'project.removed'
  | 'session.created'
  | 'session.updated'
  | 'session.removed'
  | 'paneGroup.created'
  | 'paneGroup.updated'
  | 'paneGroup.childrenChanged'
  | 'paneGroup.removed'
  | 'pane.created'
  | 'pane.updated'
  | 'pane.removed'

interface WorkspaceEventBase<TType extends WorkspaceEventType, TEntityType extends WorkspaceEntityType> {
  type: TType
  entityType: TEntityType
  entityId: string
  projectId?: string
  sessionId?: string
  paneGroupId?: string
}

export interface ProjectCreatedEvent extends WorkspaceEventBase<'project.created', 'project'> {
  after: ProjectData
}

export interface ProjectUpdatedEvent extends WorkspaceEventBase<'project.updated', 'project'> {
  before: ProjectData
  after: ProjectData
}

export interface ProjectRemovedEvent extends WorkspaceEventBase<'project.removed', 'project'> {
  before: ProjectData
}

export interface SessionCreatedEvent extends WorkspaceEventBase<'session.created', 'session'> {
  after: SessionData
}

export interface SessionUpdatedEvent extends WorkspaceEventBase<'session.updated', 'session'> {
  before: SessionData
  after: SessionData
}

export interface SessionRemovedEvent extends WorkspaceEventBase<'session.removed', 'session'> {
  before: SessionData
}

export interface PaneGroupCreatedEvent extends WorkspaceEventBase<'paneGroup.created', 'paneGroup'> {
  after: PaneGroupData
}

export interface PaneGroupUpdatedEvent extends WorkspaceEventBase<'paneGroup.updated', 'paneGroup'> {
  before: PaneGroupData
  after: PaneGroupData
}

export interface PaneGroupChildrenChangedEvent
  extends WorkspaceEventBase<'paneGroup.childrenChanged', 'paneGroup'> {
  beforeChildren: PaneGroupChild[]
  afterChildren: PaneGroupChild[]
}

export interface PaneGroupRemovedEvent extends WorkspaceEventBase<'paneGroup.removed', 'paneGroup'> {
  before: PaneGroupData
}

export interface PaneCreatedEvent extends WorkspaceEventBase<'pane.created', 'pane'> {
  after: PaneData
}

export interface PaneUpdatedEvent extends WorkspaceEventBase<'pane.updated', 'pane'> {
  before: PaneData
  after: PaneData
}

export interface PaneRemovedEvent extends WorkspaceEventBase<'pane.removed', 'pane'> {
  before: PaneData
}

export type WorkspaceEvent =
  | ProjectCreatedEvent
  | ProjectUpdatedEvent
  | ProjectRemovedEvent
  | SessionCreatedEvent
  | SessionUpdatedEvent
  | SessionRemovedEvent
  | PaneGroupCreatedEvent
  | PaneGroupUpdatedEvent
  | PaneGroupChildrenChangedEvent
  | PaneGroupRemovedEvent
  | PaneCreatedEvent
  | PaneUpdatedEvent
  | PaneRemovedEvent

export interface CreateProjectInput {
  id?: string
  name: string
  folder: string
  metadata?: EntityMetadata
}

export interface UpdateProjectInput {
  name?: string
  folder?: string
  metadata?: EntityMetadata
}

export interface CreateSessionInput {
  id?: string
  projectId: string
  name: string
  folder: string
  rootPaneGroupId?: string
}

export interface UpdateSessionInput {
  name?: string
  folder?: string
}

export interface CreatePaneGroupInput {
  id?: string
  sessionId: string
  name: string
  direction: PaneGroupLayout
  parentPaneGroupId?: string
  index?: number
}

export interface UpdatePaneGroupInput {
  name?: string
  direction?: PaneGroupLayout
}

export interface CreatePaneInput {
  id?: string
  sessionId: string
  type: PaneType
  state?: Record<string, unknown>
  parentPaneGroupId?: string
  index?: number
}

export interface UpdatePaneInput {
  type?: PaneType
  state?: Record<string, unknown>
}

export type WorkspaceCommand =
  | { type: 'project.create'; input: CreateProjectInput }
  | { type: 'project.update'; projectId: string; input: UpdateProjectInput }
  | { type: 'project.remove'; projectId: string }
  | { type: 'session.create'; input: CreateSessionInput }
  | { type: 'session.update'; sessionId: string; input: UpdateSessionInput }
  | { type: 'session.remove'; sessionId: string }
  | { type: 'session.setRootPaneGroup'; sessionId: string; rootPaneGroupId: string }
  | { type: 'paneGroup.create'; input: CreatePaneGroupInput }
  | { type: 'paneGroup.update'; paneGroupId: string; input: UpdatePaneGroupInput }
  | { type: 'paneGroup.setChildren'; paneGroupId: string; children: PaneGroupChild[] }
  | { type: 'paneGroup.insertPane'; paneGroupId: string; paneId: string; index?: number }
  | {
      type: 'paneGroup.insertPaneGroup'
      paneGroupId: string
      childPaneGroupId: string
      index?: number
    }
  | { type: 'paneNode.move'; node: PaneGroupChild; targetPaneGroupId: string; index?: number }
  | { type: 'paneNode.remove'; node: PaneGroupChild }
  | { type: 'pane.create'; input: CreatePaneInput }
  | { type: 'pane.update'; paneId: string; input: UpdatePaneInput }
  | { type: 'pane.remove'; paneId: string }

export interface WorkspaceCommandResult {
  entityId?: string
}

export type WorkspaceEventListener = (event: WorkspaceEvent) => void
export type Unsubscribe = () => void

export type PaneNodeHandle = PaneGroupHandle | PaneHandle

export interface ProjectHandle {
  readonly id: string
  readonly data: ProjectData
  readonly sessions: SessionHandle[]
  update(input: UpdateProjectInput): Promise<void>
  remove(): Promise<void>
  createSession(input: Omit<CreateSessionInput, 'projectId'>): Promise<SessionHandle>
}

export interface SessionHandle {
  readonly id: string
  readonly data: SessionData
  readonly project: ProjectHandle
  readonly rootPaneGroup: PaneGroupHandle
  update(input: UpdateSessionInput): Promise<void>
  remove(): Promise<void>
  setRootPaneGroup(rootPaneGroupId: string): Promise<void>
  createPaneGroup(input: Omit<CreatePaneGroupInput, 'sessionId'>): Promise<PaneGroupHandle>
  createPane(input: Omit<CreatePaneInput, 'sessionId'>): Promise<PaneHandle>
}

export interface PaneGroupHandle {
  readonly id: string
  readonly data: PaneGroupData
  readonly session: SessionHandle
  readonly children: PaneNodeHandle[]
  update(input: UpdatePaneGroupInput): Promise<void>
  setChildren(children: PaneGroupChild[]): Promise<void>
  insertPane(paneId: string, index?: number): Promise<void>
  insertPaneGroup(childPaneGroupId: string, index?: number): Promise<void>
  moveNode(node: PaneGroupChild, index?: number): Promise<void>
  removeNode(node: PaneGroupChild): Promise<void>
  remove(): Promise<void>
}

export interface PaneHandle {
  readonly id: string
  readonly data: PaneData
  readonly session: SessionHandle
  update(input: UpdatePaneInput): Promise<void>
  remove(): Promise<void>
}

export interface WorkspaceApi {
  readonly projects: ProjectHandle[]
  getProject(id: string): ProjectHandle | null
  getSession(id: string): SessionHandle | null
  getPaneGroup(id: string): PaneGroupHandle | null
  getPane(id: string): PaneHandle | null
  subscribe(type: WorkspaceEventType, listener: WorkspaceEventListener): Unsubscribe
  subscribeAll(listener: WorkspaceEventListener): Unsubscribe
  createProject(input: CreateProjectInput): Promise<ProjectHandle>
}
