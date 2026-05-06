import type {
  ActionContribution,
  ActionContext,
  ActionDescriptor,
  ActionExecutionRequest,
  ActionExecutionResult,
  ActionInputSpec,
  AppPlugin,
  PaneGroup,
  WorkspaceApi,
  WorkspaceStateSnapshot
} from '@sessionry/plugin-api';

const cloneValue = <T>(value: T): T => structuredClone(value);

const toDescriptor = ({ run: _run, ...action }: ActionContribution): ActionDescriptor =>
  cloneValue(action);

const getNodeId = (child: PaneGroup['children'][number]): string =>
  child.kind === 'pane' ? child.paneId : child.paneGroupId;

const getActivePaneId = (
  snapshot: WorkspaceStateSnapshot,
  sessionId?: string
): string | undefined => {
  const activeSession = sessionId
    ? snapshot.sessions.find(session => session.id === sessionId)
    : snapshot.sessions[0];
  if (!activeSession) return undefined;
  if (activeSession.focusedPaneId) return activeSession.focusedPaneId;

  const groupById = new Map(snapshot.paneGroups.map(paneGroup => [paneGroup.id, paneGroup]));

  const visitGroup = (paneGroupId: string): string | undefined => {
    const paneGroup = groupById.get(paneGroupId);
    if (!paneGroup) return undefined;

    const children =
      paneGroup.direction === 'stacked'
        ? paneGroup.children
            .filter(child => getNodeId(child) === paneGroup.activeChildId)
            .slice(0, 1)
        : paneGroup.children;

    for (const child of children) {
      if (child.kind === 'pane') return child.paneId;

      const activePaneId = visitGroup(child.paneGroupId);
      if (activePaneId) return activePaneId;
    }

    return undefined;
  };

  return visitGroup(activeSession.rootPaneGroupId);
};

export class ActionRegistry {
  private readonly actions = new Map<string, ActionContribution>();
  private readonly descriptors: ActionDescriptor[] = [];

  constructor(
    plugins: AppPlugin[],
    private readonly workspace: WorkspaceApi,
    private readonly readWorkspaceSnapshot: () => WorkspaceStateSnapshot
  ) {
    for (const plugin of plugins) {
      for (const action of plugin.actions ?? []) {
        if (this.actions.has(action.id)) {
          throw new Error(`Action "${action.id}" is already registered.`);
        }

        this.actions.set(action.id, action);
        this.descriptors.push(toDescriptor(action));
      }
    }
  }

  list(): ActionDescriptor[] {
    return this.descriptors.map(action => cloneValue(action));
  }

  async execute(request: ActionExecutionRequest): Promise<ActionExecutionResult> {
    const action = this.actions.get(request.actionId);
    if (!action) {
      throw new Error(`Action "${request.actionId}" was not found.`);
    }

    const snapshot = this.readWorkspaceSnapshot();
    const activeSessionId = snapshot.activeSessionId ?? snapshot.sessions[0]?.id;
    const activeProjectId =
      snapshot.sessions.find(session => session.id === activeSessionId)?.projectId ??
      snapshot.projects[0]?.id;
    const activePaneId = getActivePaneId(snapshot, activeSessionId);
    const context: ActionContext = {
      workspace: this.workspace,
      activeProjectId,
      activeSessionId,
      activePaneId,
      source: request.source
    };

    const providedArgs = cloneValue(request.args ?? {});
    const resolvedArgs = this.resolveArgs(action.args ?? [], providedArgs, context);
    const missing = this.getMissingInputs(action.args ?? [], providedArgs, resolvedArgs);
    if (missing.length > 0) {
      return {
        status: 'needs-input',
        action: toDescriptor(action),
        providedArgs,
        resolvedArgs,
        missing
      };
    }

    const result = await action.run(context, resolvedArgs);
    return result ?? { status: 'completed' };
  }

  private resolveArgs(
    specs: ActionInputSpec[],
    providedArgs: Record<string, unknown>,
    context: ActionContext
  ): Record<string, unknown> {
    const resolvedArgs = cloneValue(providedArgs);

    for (const spec of specs) {
      if (resolvedArgs[spec.name] !== undefined) continue;

      if (spec.fromContext && context[spec.fromContext] !== undefined) {
        resolvedArgs[spec.name] = context[spec.fromContext];
        continue;
      }

      if (spec.defaultValue !== undefined) {
        resolvedArgs[spec.name] = cloneValue(spec.defaultValue);
      }
    }

    return resolvedArgs;
  }

  private getMissingInputs(
    specs: ActionInputSpec[],
    providedArgs: Record<string, unknown>,
    resolvedArgs: Record<string, unknown>
  ): ActionInputSpec[] {
    return specs.filter(spec => {
      if (spec.promptWhen === 'always' && providedArgs[spec.name] === undefined) {
        return true;
      }

      if (!spec.required) return false;
      const value = resolvedArgs[spec.name];
      if (typeof value === 'string') return value.trim().length === 0;
      return value === undefined || value === null;
    });
  }
}
