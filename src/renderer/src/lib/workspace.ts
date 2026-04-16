import { createWorkspaceApi } from '@shared/workspaceApi'

export const workspace = createWorkspaceApi({
  read: () => window.terminalApp.workspace.read(),
  executeCommand: (command) => window.terminalApp.workspace.executeCommand(command),
  subscribeAll: (listener) => window.terminalApp.workspace.onEvent(listener)
})
