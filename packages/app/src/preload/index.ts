import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS } from '@app-shared/ipc'
import type {
  WorkspaceEvent,
  WorkspaceCommand,
  WorkspaceCommandResult,
  WorkspaceStateSnapshot
} from '@sessionry/plugin-api'
import type { PluginViewModel, UserPluginRendererInfo } from '@sessionry/plugin-api'
import type {
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalSessionInfo,
  TerminalStateEvent
} from '@sessionry/plugin-api'

type Unsubscribe = () => void

const api = {
  createTerminalSession: (): Promise<TerminalSessionInfo> => ipcRenderer.invoke(IPC_CHANNELS.terminalCreate),
  sendTerminalInput: (payload: TerminalInputPayload): void => {
    ipcRenderer.send(IPC_CHANNELS.terminalInput, payload)
  },
  resizeTerminal: (payload: TerminalResizePayload): void => {
    ipcRenderer.send(IPC_CHANNELS.terminalResize, payload)
  },
  getPluginModel: (): Promise<PluginViewModel> => ipcRenderer.invoke(IPC_CHANNELS.pluginModel),
  getUserPluginRenderers: (): Promise<UserPluginRendererInfo[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.userPluginRenderers),
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
