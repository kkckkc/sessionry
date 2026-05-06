import type {
  CreatePaneGroupInput,
  CreatePaneInput,
  CreateProjectInput,
  CreateSessionInput,
  PaneData,
  PaneGroupChild,
  PaneGroupData,
  PaneGroupHandle,
  PaneGroupLayout,
  PaneHandle,
  PaneNodeHandle,
  ProjectData,
  ProjectHandle,
  SessionData,
  SessionHandle,
  Unsubscribe,
  UpdatePaneGroupInput,
  UpdatePaneInput,
  UpdateProjectInput,
  UpdateSessionInput,
  WorkspaceApi,
  WorkspaceCommand,
  WorkspaceCommandResult,
  WorkspaceEvent,
  WorkspaceEventListener,
  WorkspaceEventType,
  WorkspaceStateSnapshot
} from './workspace';

const cloneValue = <T>(value: T): T => structuredClone(value);

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const property of Object.values(value as Record<string, unknown>)) {
      deepFreeze(property);
    }
  }

  return value;
};

const freezeClone = <T>(value: T): T => deepFreeze(cloneValue(value));

const getRequired = <T>(value: T | undefined | null, label: string, id: string): T => {
  if (!value) throw new Error(`${label} "${id}" was not found.`);
  return value;
};

const isPaneGroup = (child: PaneGroupChild): child is Extract<PaneGroupChild, { kind: 'group' }> =>
  child.kind === 'group';

export interface WorkspaceBridge {
  read(): WorkspaceStateSnapshot;
  executeCommand(
    command: WorkspaceCommand
  ): Promise<WorkspaceCommandResult> | WorkspaceCommandResult;
  subscribeAll(listener: WorkspaceEventListener): Unsubscribe;
}

export const createWorkspaceApi = (bridge: WorkspaceBridge): WorkspaceApi => {
  const read = (): WorkspaceStateSnapshot => freezeClone(bridge.read());

  const getProjectData = (id: string): ProjectData =>
    getRequired(
      read().projects.find(project => project.id === id),
      'Project',
      id
    );

  const getSessionData = (id: string): SessionData =>
    getRequired(
      read().sessions.find(session => session.id === id),
      'Session',
      id
    );

  const getPaneGroupData = (id: string): PaneGroupData =>
    getRequired(
      read().paneGroups.find(paneGroup => paneGroup.id === id),
      'Pane group',
      id
    );

  const getPaneData = (id: string): PaneData =>
    getRequired(
      read().panes.find(pane => pane.id === id),
      'Pane',
      id
    );

  class ProjectHandleImpl implements ProjectHandle {
    constructor(readonly id: string) {}

    get data(): ProjectData {
      return freezeClone(getProjectData(this.id));
    }

    get sessions(): SessionHandle[] {
      return read()
        .sessions.filter(session => session.projectId === this.id)
        .map(session => new SessionHandleImpl(session.id));
    }

    async update(input: UpdateProjectInput): Promise<void> {
      await bridge.executeCommand({ type: 'project.update', projectId: this.id, input });
    }

    async remove(): Promise<void> {
      await bridge.executeCommand({ type: 'project.remove', projectId: this.id });
    }

    async createSession(input: Omit<CreateSessionInput, 'projectId'>): Promise<SessionHandle> {
      const result = await bridge.executeCommand({
        type: 'session.create',
        input: { ...input, projectId: this.id }
      });
      return new SessionHandleImpl(result.entityId ?? '');
    }
  }

  class SessionHandleImpl implements SessionHandle {
    constructor(readonly id: string) {}

    get data(): SessionData {
      return freezeClone(getSessionData(this.id));
    }

    get project(): ProjectHandle {
      return new ProjectHandleImpl(this.data.projectId);
    }

    get rootPaneGroup(): PaneGroupHandle {
      return new PaneGroupHandleImpl(this.data.rootPaneGroupId);
    }

    async activate(): Promise<void> {
      await bridge.executeCommand({ type: 'session.activate', sessionId: this.id });
    }

    async update(input: UpdateSessionInput): Promise<void> {
      await bridge.executeCommand({ type: 'session.update', sessionId: this.id, input });
    }

    async setFocusedPane(paneId?: string): Promise<void> {
      await bridge.executeCommand({ type: 'session.setFocusedPane', sessionId: this.id, paneId });
    }

    async remove(): Promise<void> {
      await bridge.executeCommand({ type: 'session.remove', sessionId: this.id });
    }

    async setRootPaneGroup(rootPaneGroupId: string): Promise<void> {
      await bridge.executeCommand({
        type: 'session.setRootPaneGroup',
        sessionId: this.id,
        rootPaneGroupId
      });
    }

    async createPaneGroup(
      input: Omit<CreatePaneGroupInput, 'sessionId'>
    ): Promise<PaneGroupHandle> {
      const result = await bridge.executeCommand({
        type: 'paneGroup.create',
        input: { ...input, sessionId: this.id }
      });
      return new PaneGroupHandleImpl(result.entityId ?? '');
    }

    async createPane(input: Omit<CreatePaneInput, 'sessionId'>): Promise<PaneHandle> {
      const result = await bridge.executeCommand({
        type: 'pane.create',
        input: { ...input, sessionId: this.id }
      });
      return new PaneHandleImpl(result.entityId ?? '');
    }
  }

  class PaneGroupHandleImpl implements PaneGroupHandle {
    constructor(readonly id: string) {}

    get data(): PaneGroupData {
      return freezeClone(getPaneGroupData(this.id));
    }

    get session(): SessionHandle {
      return new SessionHandleImpl(this.data.sessionId);
    }

    get children(): PaneNodeHandle[] {
      return this.data.children.map(child =>
        isPaneGroup(child)
          ? new PaneGroupHandleImpl(child.paneGroupId)
          : new PaneHandleImpl(child.paneId)
      );
    }

    async update(input: UpdatePaneGroupInput): Promise<void> {
      await bridge.executeCommand({ type: 'paneGroup.update', paneGroupId: this.id, input });
    }

    async setChildren(children: PaneGroupChild[]): Promise<void> {
      await bridge.executeCommand({
        type: 'paneGroup.setChildren',
        paneGroupId: this.id,
        children
      });
    }

    async insertPane(paneId: string, index?: number): Promise<void> {
      await bridge.executeCommand({
        type: 'paneGroup.insertPane',
        paneGroupId: this.id,
        paneId,
        index
      });
    }

    async insertPaneGroup(childPaneGroupId: string, index?: number): Promise<void> {
      await bridge.executeCommand({
        type: 'paneGroup.insertPaneGroup',
        paneGroupId: this.id,
        childPaneGroupId,
        index
      });
    }

    async moveNode(node: PaneGroupChild, index?: number): Promise<void> {
      await bridge.executeCommand({
        type: 'paneNode.move',
        node,
        targetPaneGroupId: this.id,
        index
      });
    }

    async removeNode(node: PaneGroupChild): Promise<void> {
      await bridge.executeCommand({ type: 'paneNode.remove', node });
    }

    async remove(): Promise<void> {
      await bridge.executeCommand({
        type: 'paneNode.remove',
        node: { kind: 'group', paneGroupId: this.id }
      });
    }

    async split(
      direction: Exclude<PaneGroupLayout, 'stacked'>,
      newChild?: PaneGroupChild
    ): Promise<PaneGroupHandle> {
      const result = await bridge.executeCommand({
        type: 'paneGroup.split',
        paneGroupId: this.id,
        direction,
        newChild
      });
      return new PaneGroupHandleImpl(result.entityId ?? '');
    }
  }

  class PaneHandleImpl implements PaneHandle {
    constructor(readonly id: string) {}

    get data(): PaneData {
      return freezeClone(getPaneData(this.id));
    }

    get session(): SessionHandle {
      return new SessionHandleImpl(this.data.sessionId);
    }

    async split(direction: 'horizontal' | 'vertical'): Promise<PaneGroupHandle> {
      const result = await bridge.executeCommand({
        type: 'pane.split',
        paneId: this.id,
        direction
      });
      return new PaneGroupHandleImpl(result.entityId ?? '');
    }

    async convertToTabs(): Promise<PaneGroupHandle> {
      const result = await bridge.executeCommand({ type: 'pane.convertToTabs', paneId: this.id });
      return new PaneGroupHandleImpl(result.entityId ?? '');
    }

    async update(input: UpdatePaneInput): Promise<void> {
      await bridge.executeCommand({ type: 'pane.update', paneId: this.id, input });
    }

    async remove(): Promise<void> {
      await bridge.executeCommand({ type: 'pane.remove', paneId: this.id });
    }
  }

  const getProject = (id: string): ProjectHandle | null =>
    read().projects.some(project => project.id === id) ? new ProjectHandleImpl(id) : null;

  const getSession = (id: string): SessionHandle | null =>
    read().sessions.some(session => session.id === id) ? new SessionHandleImpl(id) : null;

  const getPaneGroup = (id: string): PaneGroupHandle | null =>
    read().paneGroups.some(paneGroup => paneGroup.id === id) ? new PaneGroupHandleImpl(id) : null;

  const getPane = (id: string): PaneHandle | null =>
    read().panes.some(pane => pane.id === id) ? new PaneHandleImpl(id) : null;

  return {
    get snapshot(): WorkspaceStateSnapshot {
      return read();
    },
    get projects(): ProjectHandle[] {
      return read().projects.map(project => new ProjectHandleImpl(project.id));
    },
    getProject,
    getSession,
    getPaneGroup,
    getPane,
    subscribe(type: WorkspaceEventType, listener: WorkspaceEventListener): Unsubscribe {
      return bridge.subscribeAll((event: WorkspaceEvent) => {
        if (event.type === type) listener(freezeClone(event));
      });
    },
    subscribeAll(listener: WorkspaceEventListener): Unsubscribe {
      return bridge.subscribeAll((event: WorkspaceEvent) => listener(freezeClone(event)));
    },
    async createProject(input: CreateProjectInput): Promise<ProjectHandle> {
      const result = await bridge.executeCommand({ type: 'project.create', input });
      return new ProjectHandleImpl(result.entityId ?? '');
    }
  };
};
