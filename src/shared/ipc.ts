export const IPC_CHANNELS = {
  terminalCreate: 'terminal:create',
  terminalInput: 'terminal:input',
  terminalResize: 'terminal:resize',
  terminalData: 'terminal:data',
  terminalExit: 'terminal:exit',
  terminalState: 'terminal:state',
  pluginModel: 'plugins:model',
  workspaceRead: 'workspace:read',
  workspaceCommand: 'workspace:command',
  workspaceEvent: 'workspace:event'
} as const
