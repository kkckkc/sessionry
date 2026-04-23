import { app, BrowserWindow, dialog, ipcMain, net, protocol } from 'electron'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { IPC_CHANNELS } from '@app-shared/ipc'
import { createWorkspaceApi } from '@sessionry/plugin-api'
import type { WorkspaceCommand, WorkspaceEvent } from '@sessionry/plugin-api'
import type { CreateTerminalSessionInput, TerminalInputPayload, TerminalResizePayload } from '@sessionry/plugin-api'

import { WorkspaceStore } from './workspaceStore'
import { ActionRegistry } from './actionRegistry'
import { createPluginManager } from './pluginManager'
import { builtInPlugins } from './plugins'
import { TerminalService } from './terminalService'
import { loadUserPlugins } from './pluginLoader'

// Must be called before app.whenReady().
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'sessionry',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
  }
])

let mainWindow: BrowserWindow | null = null

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#0d1118',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 20 },
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

app.whenReady().then(async () => {
  const userPlugins = await loadUserPlugins()

  // Build an allowlist of dir names for loaded plugins to prevent path traversal.
  const pluginDirMap = new Map(userPlugins.map((p) => [p.dirName, p.pluginDir]))
  const hostLibsDir = path.join(__dirname, '../host')

  protocol.handle('sessionry', (request) => {
    const url = new URL(request.url)

    if (url.host === 'host') {
      const rel = url.pathname.slice(1) // strip leading '/'
      const filePath = path.resolve(hostLibsDir, rel)
      if (!filePath.startsWith(hostLibsDir + path.sep) && filePath !== hostLibsDir) {
        return new Response('Not found', { status: 404 })
      }
      return net.fetch(pathToFileURL(filePath).href)
    }

    if (url.host === 'plugin') {
      const segments = url.pathname.slice(1).split('/')
      const dirName = segments[0]
      const rest = segments.slice(1)
      const pluginDir = pluginDirMap.get(dirName)
      if (!pluginDir || rest.length === 0) return new Response('Not found', { status: 404 })
      const filePath = path.resolve(pluginDir, ...rest)
      if (!filePath.startsWith(pluginDir + path.sep)) {
        return new Response('Forbidden', { status: 403 })
      }
      return net.fetch(pathToFileURL(filePath).href)
    }

    return new Response('Not found', { status: 404 })
  })

  const workspaceStore = new WorkspaceStore()
  const workspaceApi = createWorkspaceApi({
    read: () => workspaceStore.read(),
    executeCommand: (command: WorkspaceCommand) => workspaceStore.executeCommand(command),
    subscribeAll: (listener) => workspaceStore.subscribeAll(listener)
  })
  const allPlugins = [...builtInPlugins, ...userPlugins.map((p) => p.plugin)]
  const actionRegistry = new ActionRegistry(allPlugins, workspaceApi, () => workspaceStore.read())
  const pluginManager = createPluginManager(
    { workspace: workspaceApi },
    userPlugins.map((p) => p.plugin)
  )
  const terminalService = new TerminalService(
    (event) => mainWindow?.webContents.send(IPC_CHANNELS.terminalData, event),
    (event) => mainWindow?.webContents.send(IPC_CHANNELS.terminalState, event),
    (event) => mainWindow?.webContents.send(IPC_CHANNELS.terminalExit, event)
  )

  workspaceStore.subscribeAll((event: WorkspaceEvent) => {
    mainWindow?.webContents.send(IPC_CHANNELS.workspaceEvent, event)
  })

  ipcMain.handle(IPC_CHANNELS.terminalCreate, (_event, input: CreateTerminalSessionInput) =>
    terminalService.createSession(input)
  )
  ipcMain.on(IPC_CHANNELS.terminalInput, (_event, payload: TerminalInputPayload) => {
    terminalService.handleInput(payload)
  })
  ipcMain.on(IPC_CHANNELS.terminalResize, (_event, payload: TerminalResizePayload) => {
    terminalService.handleResize(payload)
  })
  ipcMain.handle(IPC_CHANNELS.pluginModel, () => pluginManager.getViewModel())
  ipcMain.handle(IPC_CHANNELS.userPluginRenderers, () =>
    userPlugins
      .filter((p) => p.manifest.renderer != null)
      .map((p) => ({
        pluginId: p.manifest.id,
        rendererUrl: `sessionry://plugin/${p.dirName}/${p.manifest.renderer}`
      }))
  )
  ipcMain.handle(IPC_CHANNELS.actionsList, () => actionRegistry.list())
  ipcMain.handle(IPC_CHANNELS.actionsExecute, (_event, request) => actionRegistry.execute(request))
  ipcMain.on(IPC_CHANNELS.workspaceRead, (event) => {
    event.returnValue = workspaceStore.read()
  })
  ipcMain.handle(IPC_CHANNELS.workspaceCommand, (_event, command: WorkspaceCommand) =>
    workspaceStore.executeCommand(command)
  )
  ipcMain.handle(IPC_CHANNELS.showFolderDialog, () =>
    dialog.showOpenDialog(mainWindow!, { properties: ['openDirectory', 'createDirectory'] })
  )

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
