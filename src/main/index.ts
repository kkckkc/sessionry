import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import process from 'node:process'

import { IPC_CHANNELS } from '@shared/ipc'
import type { TerminalInputPayload, TerminalResizePayload } from '@shared/terminal'

import { createPluginManager } from './pluginManager'
import { TerminalService } from './terminalService'

let mainWindow: BrowserWindow | null = null

const pluginManager = createPluginManager()

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#0d1118',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      // electron-vite emits preload as ESM in production.
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL

  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  const terminalService = new TerminalService(
    (event) => mainWindow?.webContents.send(IPC_CHANNELS.terminalData, event),
    (event) => mainWindow?.webContents.send(IPC_CHANNELS.terminalState, event),
    (event) => mainWindow?.webContents.send(IPC_CHANNELS.terminalExit, event)
  )

  ipcMain.handle(IPC_CHANNELS.terminalCreate, () => terminalService.createSession())
  ipcMain.on(IPC_CHANNELS.terminalInput, (_event, payload: TerminalInputPayload) => {
    terminalService.handleInput(payload)
  })
  ipcMain.on(IPC_CHANNELS.terminalResize, (_event, payload: TerminalResizePayload) => {
    terminalService.handleResize(payload)
  })
  ipcMain.handle(IPC_CHANNELS.pluginModel, () => pluginManager.getViewModel())

  app.on('before-quit', () => {
    terminalService.dispose()
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
