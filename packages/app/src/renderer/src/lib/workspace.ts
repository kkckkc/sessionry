import { createWorkspaceApi } from '@sessionry/plugin-api'

export const readWorkspaceSnapshot = () => window.terminalApp.workspace.read()

export const workspace = createWorkspaceApi({
  read: readWorkspaceSnapshot,
  executeCommand: (command) => window.terminalApp.workspace.executeCommand(command),
  subscribeAll: (listener) => window.terminalApp.workspace.onEvent(listener)
})
