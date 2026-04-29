import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol } from 'electron'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { IPC_CHANNELS } from '@app-shared/ipc'
import { createWorkspaceApi } from '@sessionry/plugin-api'
import type { PluginIpcApi, WorkspaceCommand, WorkspaceEvent } from '@sessionry/plugin-api'

import { WorkspaceStore } from './workspaceStore'
import { ActionRegistry } from './actionRegistry'
import { createPluginManager } from './pluginManager'
import { builtInPlugins } from './plugins'
import { SettingsStore } from './settingsStore'
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
    trafficLightPosition: { x: 15, y: 12 },
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

  const settingsStorePath = path.join(app.getPath('userData'), 'settings.yaml')
  const settingsStore = new SettingsStore(settingsStorePath)

  const workspaceStorePath = path.join(app.getPath('userData'), 'workspace.json')
  const workspaceStore = new WorkspaceStore(workspaceStorePath)
  const workspaceApi = createWorkspaceApi({
    read: () => workspaceStore.read(),
    executeCommand: (command: WorkspaceCommand) => workspaceStore.executeCommand(command),
    subscribeAll: (listener) => workspaceStore.subscribeAll(listener)
  })
  const allPlugins = [...builtInPlugins, ...userPlugins.map((p) => p.plugin)]
  const actionRegistry = new ActionRegistry(allPlugins, workspaceApi, () => workspaceStore.read())

  const ipcApi: PluginIpcApi = {
    handle: (channel, handler) =>
      ipcMain.handle(channel, (_event, ...args) => handler(...args)),
    on: (channel, handler) =>
      ipcMain.on(channel, (_event, ...args) => handler(...args)),
    emit: (channel, ...args) =>
      mainWindow?.webContents.send(channel, ...args)
  }

  const pluginManager = createPluginManager(
    {
      workspace: workspaceApi,
      ipc: ipcApi,
      settings: settingsStore.read(),
      onBeforeQuit: (handler) => app.on('before-quit', handler)
    },
    userPlugins.map((p) => p.plugin)
  )

  workspaceStore.subscribeAll((event: WorkspaceEvent) => {
    mainWindow?.webContents.send(IPC_CHANNELS.workspaceEvent, event)
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
  ipcMain.handle(IPC_CHANNELS.settingsRead, () => settingsStore.read())
  ipcMain.handle(IPC_CHANNELS.settingsUpdate, (_event, updates) => {
    settingsStore.update(updates)
    mainWindow?.webContents.send('settings:changed', settingsStore.read())
  })

  const createMenu = () => {
    const settings = settingsStore.read()
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'View',
        submenu: [
          {
            label: 'Toggle Status Bar',
            type: 'checkbox',
            checked: settings.statusBarVisible,
            click: () => {
              const currentSettings = settingsStore.read()
              settingsStore.update({ statusBarVisible: !currentSettings.statusBarVisible })
              mainWindow?.webContents.send('settings:changed', settingsStore.read())
              createMenu()
            }
          }
        ]
      }
    ]

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      })
    }

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  createMenu()
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
