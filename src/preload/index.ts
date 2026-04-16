import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { PluginViewModel } from '@shared/plugins'
import type {
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalSessionInfo,
  TerminalStateEvent
} from '@shared/terminal'

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
