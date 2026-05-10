export const IPC_CHANNELS = {
  // Workspace
  workspaceRead: 'workspace:read',
  workspaceCommand: 'workspace:command',
  workspaceEvent: 'workspace:event',

  // Actions
  actionsList: 'actions:list',
  actionsExecute: 'actions:execute',

  // Plugins
  pluginModel: 'plugin:model',
  userPluginRenderers: 'plugin:user-renderers',

  // Plugin Management
  pluginManagementList: 'plugin-management:list',
  pluginManagementEnable: 'plugin-management:enable',
  pluginManagementDisable: 'plugin-management:disable',
  pluginManagementGetConfig: 'plugin-management:get-config',

  // Settings
  settingsRead: 'settings:read',
  settingsUpdate: 'settings:update',

  // File System
  openExternal: 'fs:open-external',
  showFolderDialog: 'fs:show-folder-dialog',
  readDirectory: 'fs:read-directory',
  readFile: 'fs:read-file',
  writeFile: 'fs:write-file',
  vcsStatus: 'vcs:status',
  vcsDiff: 'vcs:diff',
  vcsStageFiles: 'vcs:stage-files',
  vcsCommit: 'vcs:commit',
  vcsPush: 'vcs:push',
  vcsPull: 'vcs:pull',
  vcsCreatePullRequest: 'vcs:create-pull-request',
  vcsCreateBranch: 'vcs:create-branch',
  vcsListBranches: 'vcs:list-branches',
  vcsSwitchBranch: 'vcs:switch-branch',

  // Themes
  themesList: 'themes:list',
  themesRegister: 'themes:register',

  // Terminal
  terminalCreate: 'terminal:create',
  terminalInput: 'terminal:input',
  terminalResize: 'terminal:resize',
  terminalData: 'terminal:data',
  terminalState: 'terminal:state',
  terminalExit: 'terminal:exit'
} as const;
