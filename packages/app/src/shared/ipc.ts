export const IPC_CHANNELS = {
  terminalCreate: 'terminal:create',
  terminalInput: 'terminal:input',
  terminalResize: 'terminal:resize',
  terminalData: 'terminal:data',
  terminalExit: 'terminal:exit',
  terminalState: 'terminal:state',
  pluginModel: 'plugins:model',
  userPluginRenderers: 'plugins:user-renderers',
  actionsList: 'actions:list',
  actionsExecute: 'actions:execute',
  workspaceRead: 'workspace:read',
  workspaceCommand: 'workspace:command',
  workspaceEvent: 'workspace:event',
  showFolderDialog: 'dialog:show-folder',
  settingsRead: 'settings:read',
  settingsUpdate: 'settings:update'
} as const
