import type { ActionDescriptor, ActionExecutionRequest, ActionExecutionResult } from './actions'
import type { PluginViewModel } from './plugins'
import type {
  WorkspaceCommand,
  WorkspaceCommandResult,
  WorkspaceEvent,
  WorkspaceStateSnapshot
} from './workspace'
import type {
  CreateTerminalSessionInput,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalSessionInfo,
  TerminalStateEvent
} from './terminal'

export interface UserPluginRendererInfo {
  pluginId: string
  rendererUrl: string
}

export interface TerminalAppBridge {
  showFolderDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
  createTerminalSession: (input: CreateTerminalSessionInput) => Promise<TerminalSessionInfo>
  sendTerminalInput: (payload: TerminalInputPayload) => void
  resizeTerminal: (payload: TerminalResizePayload) => void
  getPluginModel: () => Promise<PluginViewModel>
  getUserPluginRenderers: () => Promise<UserPluginRendererInfo[]>
  actions: {
    list: () => Promise<ActionDescriptor[]>
    execute: (request: ActionExecutionRequest) => Promise<ActionExecutionResult>
  }
  workspace: {
    read: () => WorkspaceStateSnapshot
    executeCommand: (command: WorkspaceCommand) => Promise<WorkspaceCommandResult>
    onEvent: (listener: (event: WorkspaceEvent) => void) => () => void
  }
  onTerminalData: (listener: (event: TerminalDataEvent) => void) => () => void
  onTerminalState: (listener: (event: TerminalStateEvent) => void) => () => void
  onTerminalExit: (listener: (event: TerminalExitEvent) => void) => () => void
}
