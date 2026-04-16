import type { WorkspaceApi, WorkspaceEntityType } from './workspace'

export type ActionId = string
export type ActionSurface = 'toolbar' | 'palette'
export type ActionInvocationSource = 'toolbar' | 'shortcut' | 'palette' | 'api' | 'cli'
export type ActionArgumentType = 'string' | 'boolean' | 'number' | 'entity-ref' | 'enum'

export interface ActionOption {
  value: string
  label: string
}

export interface ActionInputSpec {
  name: string
  label: string
  description?: string
  type: ActionArgumentType
  required?: boolean
  defaultValue?: unknown
  options?: ActionOption[]
  entityType?: WorkspaceEntityType
  fromContext?: 'activeProjectId' | 'activeSessionId' | 'activePaneId'
  promptWhen?: 'missing' | 'always'
  hidden?: boolean
}

export interface ActionClientEffect {
  type: 'layout.toggle-left' | 'layout.toggle-right' | 'terminal.clear-active' | 'terminal.restart-active'
  payload?: Record<string, unknown>
}

export interface ActionDescriptor {
  id: ActionId
  name: string
  description?: string
  category?: string
  defaultKeybinding?: string
  when?: string
  args?: ActionInputSpec[]
  surfaces?: ActionSurface[]
}

export interface ActionContext {
  workspace: WorkspaceApi
  activeProjectId?: string
  activeSessionId?: string
  activePaneId?: string
  source: ActionInvocationSource
}

export interface ActionExecutionRequest {
  actionId: ActionId
  source: ActionInvocationSource
  args?: Record<string, unknown>
}

export interface ActionCompletedResult {
  status: 'completed'
  effects?: ActionClientEffect[]
}

export interface ActionNeedsInputResult {
  status: 'needs-input'
  action: ActionDescriptor
  providedArgs: Record<string, unknown>
  resolvedArgs: Record<string, unknown>
  missing: ActionInputSpec[]
}

export type ActionExecutionResult = ActionCompletedResult | ActionNeedsInputResult

export interface ActionContribution extends ActionDescriptor {
  run: (
    context: ActionContext,
    args: Record<string, unknown>
  ) => Promise<ActionExecutionResult | void> | ActionExecutionResult | void
}
