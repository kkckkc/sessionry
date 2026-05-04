import path from 'node:path'

import { contextBridge, ipcRenderer, webUtils } from 'electron'

import { IPC_CHANNELS } from '@app-shared/ipc'
import type {
  ActionDescriptor,
  ActionExecutionRequest,
  ActionExecutionResult,
  AppSettings,
  ThemeDefinition,
  WorkspaceEvent,
  WorkspaceCommand,
  WorkspaceCommandResult,
  WorkspaceStateSnapshot
} from '@sessionry/plugin-api'
import type { PluginViewModel, UserPluginRendererInfo } from '@sessionry/plugin-api'
import type {
  CreateTerminalSessionInput,
  VcsFileStatus,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalSessionInfo,
  TerminalStateEvent
} from '@sessionry/plugin-api'

type Unsubscribe = () => void

const shellEscapePath = (value: string): string => {
  if (value.length === 0) return "''"
  return /^[A-Za-z0-9_./-]+$/.test(value)
    ? value
    : `'${value.replace(/'/g, `'\\''`)}'`
}

const formatPathForTerminal = (targetPath: string, sessionRoot?: string): string => {
  if (!sessionRoot) return shellEscapePath(targetPath)

  const relativePath = path.relative(sessionRoot, targetPath)
  const isWithinRoot =
    relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))

  return shellEscapePath(isWithinRoot ? relativePath || '.' : targetPath)
}

const api = {
  createTerminalSession: (input: CreateTerminalSessionInput): Promise<TerminalSessionInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.terminalCreate, input),
  sendTerminalInput: (payload: TerminalInputPayload): void => {
    ipcRenderer.send(IPC_CHANNELS.terminalInput, payload)
  },
  resizeTerminal: (payload: TerminalResizePayload): void => {
    ipcRenderer.send(IPC_CHANNELS.terminalResize, payload)
  },
  getPluginModel: (): Promise<PluginViewModel> => ipcRenderer.invoke(IPC_CHANNELS.pluginModel),
  getUserPluginRenderers: (): Promise<UserPluginRendererInfo[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.userPluginRenderers),
  actions: {
    list: (): Promise<ActionDescriptor[]> => ipcRenderer.invoke(IPC_CHANNELS.actionsList),
    execute: (request: ActionExecutionRequest): Promise<ActionExecutionResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.actionsExecute, request)
  },
  workspace: {
    read: (): WorkspaceStateSnapshot =>
      ipcRenderer.sendSync(IPC_CHANNELS.workspaceRead) as WorkspaceStateSnapshot,
    executeCommand: (command: WorkspaceCommand): Promise<WorkspaceCommandResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.workspaceCommand, command),
    onEvent: (listener: (event: WorkspaceEvent) => void): Unsubscribe => {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: WorkspaceEvent) => listener(payload)
      ipcRenderer.on(IPC_CHANNELS.workspaceEvent, wrapped)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.workspaceEvent, wrapped)
    }
  },
  showFolderDialog: (): Promise<{ canceled: boolean; filePaths: string[] }> =>
    ipcRenderer.invoke(IPC_CHANNELS.showFolderDialog),
  readDirectory: (dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.readDirectory, dirPath),
  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.readFile, filePath),
  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.writeFile, filePath, content),
  vcs: {
    getStatus: (dirPath: string) => ipcRenderer.invoke(IPC_CHANNELS.vcsStatus, dirPath),
    getDiff: (dirPath: string, file: VcsFileStatus) =>
      ipcRenderer.invoke(IPC_CHANNELS.vcsDiff, dirPath, file)
  },
  getPathForDroppedFile: (file: File): string => webUtils.getPathForFile(file),
  formatPathForTerminal,
  settings: {
    read: (): Promise<AppSettings> => ipcRenderer.invoke(IPC_CHANNELS.settingsRead),
    readSync: (): AppSettings => ipcRenderer.sendSync(IPC_CHANNELS.settingsRead) as AppSettings,
    update: (updates: Partial<AppSettings>): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, updates),
    onChange: (listener: (settings: AppSettings) => void): Unsubscribe => {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: AppSettings) => listener(payload)
      ipcRenderer.on('settings:changed', wrapped)
      return () => ipcRenderer.removeListener('settings:changed', wrapped)
    }
  },
  themes: {
    getTheme: (themeId: string): Promise<ThemeDefinition | undefined> =>
      ipcRenderer.invoke('themes:get', themeId),
    getAllThemes: (): Promise<ThemeDefinition[]> =>
      ipcRenderer.invoke('themes:getAll'),
    getThemeIds: (): Promise<string[]> =>
      ipcRenderer.invoke('themes:getIds')
  },
  plugins: {
    search: (query: string, options?: { size?: number }): Promise<any> =>
      ipcRenderer.invoke('plugin:search', { query, ...options }),
    install: (packageName: string, version?: string): Promise<any> =>
      ipcRenderer.invoke('plugin:install', { packageName, version }),
    uninstall: (pluginId: string): Promise<any> =>
      ipcRenderer.invoke('plugin:uninstall', { pluginId }),
    update: (pluginId: string, packageName: string): Promise<any> =>
      ipcRenderer.invoke('plugin:update', { pluginId, packageName }),
    list: (): Promise<any> =>
      ipcRenderer.invoke('plugin:list'),
    enable: (pluginId: string): Promise<any> =>
      ipcRenderer.invoke('plugin:enable', { pluginId }),
    disable: (pluginId: string): Promise<any> =>
      ipcRenderer.invoke('plugin:disable', { pluginId }),
    checkUpdates: (): Promise<any> =>
      ipcRenderer.invoke('plugin:check-updates'),
    onInstallProgress: (listener: (data: { downloaded: number; total: number }) => void): Unsubscribe => {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: { downloaded: number; total: number }) => listener(payload)
      ipcRenderer.on('plugin:install:progress', wrapped)
      return () => ipcRenderer.removeListener('plugin:install:progress', wrapped)
    },
    onUpdateProgress: (listener: (data: { downloaded: number; total: number }) => void): Unsubscribe => {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: { downloaded: number; total: number }) => listener(payload)
      ipcRenderer.on('plugin:update:progress', wrapped)
      return () => ipcRenderer.removeListener('plugin:update:progress', wrapped)
    }
  },
  onTerminalData: (listener: (event: TerminalDataEvent) => void): Unsubscribe => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: TerminalDataEvent) => listener(payload)
    ipcRenderer.on(IPC_CHANNELS.terminalData, wrapped)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.terminalData, wrapped)
  },
  onTerminalState: (listener: (event: TerminalStateEvent) => void): Unsubscribe => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: TerminalStateEvent) => listener(payload)
    ipcRenderer.on(IPC_CHANNELS.terminalState, wrapped)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.terminalState, wrapped)
  },
  onTerminalExit: (listener: (event: TerminalExitEvent) => void): Unsubscribe => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: TerminalExitEvent) => listener(payload)
    ipcRenderer.on(IPC_CHANNELS.terminalExit, wrapped)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.terminalExit, wrapped)
  }
}

contextBridge.exposeInMainWorld('terminalApp', api)
