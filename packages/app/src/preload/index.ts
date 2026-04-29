import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS } from '@app-shared/ipc'
import type {
  ActionDescriptor,
  ActionExecutionRequest,
  ActionExecutionResult,
  AppSettings,
  WorkspaceEvent,
  WorkspaceCommand,
  WorkspaceCommandResult,
  WorkspaceStateSnapshot
} from '@sessionry/plugin-api'
import type { PluginViewModel, UserPluginRendererInfo } from '@sessionry/plugin-api'
import type {
  CreateTerminalSessionInput,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalSessionInfo,
  TerminalStateEvent
} from '@sessionry/plugin-api'

type Unsubscribe = () => void

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
