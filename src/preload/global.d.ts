import type {
  WorkspaceEvent,
  WorkspaceCommand,
  WorkspaceCommandResult,
  WorkspaceStateSnapshot
} from '@shared/workspace'
import type { PluginViewModel } from '@shared/plugins'
import type {
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalSessionInfo,
  TerminalStateEvent
} from '@shared/terminal'

declare global {
  interface Window {
    terminalApp: {
      createTerminalSession: () => Promise<TerminalSessionInfo>
      sendTerminalInput: (payload: TerminalInputPayload) => void
      resizeTerminal: (payload: TerminalResizePayload) => void
      getPluginModel: () => Promise<PluginViewModel>
      workspace: {
        read: () => WorkspaceStateSnapshot
        executeCommand: (command: WorkspaceCommand) => Promise<WorkspaceCommandResult>
        onEvent: (listener: (event: WorkspaceEvent) => void) => () => void
      }
      onTerminalData: (listener: (event: TerminalDataEvent) => void) => () => void
      onTerminalState: (listener: (event: TerminalStateEvent) => void) => () => void
      onTerminalExit: (listener: (event: TerminalExitEvent) => void) => () => void
    }
  }
}

export {}
