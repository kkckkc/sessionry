import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { IPC_CHANNELS } from '@app-shared/ipc';
import { createWorkspaceApi } from '@sessionry/plugin-api';
import type { PluginIpcApi, WorkspaceCommand, WorkspaceEvent } from '@sessionry/plugin-api';
import type { AppPlugin } from '@sessionry/plugin-api';
import type { InstalledPlugin } from '@sessionry/plugin-api';

import { WorkspaceStore } from './workspaceStore';
import { ActionRegistry } from './actionRegistry';
import { createPluginManager } from './pluginManager';
import { builtInPlugins } from './plugins';
import { SettingsStore } from './settingsStore';
import { loadUserPlugins } from './pluginLoader';
import { registerThemeHandlers } from './ipc/themeHandlers';
import { registerPluginManagerHandlers } from './ipc/pluginManagerHandlers';
import { PluginConfigStore } from './pluginConfigStore';
import { syncPluginConfiguration } from './pluginDiscovery';
import { createVcsService } from './vcsService';

const BUILTIN_CORE_PLUGIN_ID = 'core';

const syncBuiltInPluginConfiguration = (
  currentConfig: InstalledPlugin[],
  builtInPlugins: AppPlugin[]
) => {
  const configMap = new Map(currentConfig.map(plugin => [plugin.id, plugin]));
  const synced = [...currentConfig.filter(plugin => plugin.source !== 'builtin')];

  for (const plugin of builtInPlugins) {
    const existing = configMap.get(plugin.id);
    synced.push({
      id: plugin.id,
      source: 'builtin',
      version: '1.0.0',
      enabled: plugin.id === BUILTIN_CORE_PLUGIN_ID ? true : (existing?.enabled ?? true)
    });
  }

  return synced;
};

// Must be called before app.whenReady().
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'sessionry',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
  }
]);

let mainWindow: BrowserWindow | null = null;

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
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;

  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(async () => {
  const settingsStorePath = path.join(app.getPath('userData'), 'settings.yaml');
  const settingsStore = new SettingsStore(settingsStorePath);

  // Sync plugin configuration with discovered local plugins
  const currentPluginManagement = settingsStore.read().pluginManagement ?? {
    registry: { url: 'https://registry.npmjs.org', scope: '@sessionry' },
    installed: []
  };
  const syncedLocalAndNpmPlugins = syncPluginConfiguration(currentPluginManagement.installed);
  const syncedPlugins = syncBuiltInPluginConfiguration(syncedLocalAndNpmPlugins, builtInPlugins);
  const pluginManagement = {
    ...currentPluginManagement,
    installed: syncedPlugins
  };

  // Save synced configuration
  if (syncedPlugins.length !== currentPluginManagement.installed.length) {
    settingsStore.update({ pluginManagement });
  }

  // Create plugin config store from synced settings
  const pluginConfigStore = new PluginConfigStore(pluginManagement);

  const userPlugins = await loadUserPlugins(pluginConfigStore);
  const enabledBuiltInPlugins = builtInPlugins.filter(
    plugin => plugin.id === BUILTIN_CORE_PLUGIN_ID || pluginConfigStore.isPluginEnabled(plugin.id)
  );

  // Build an allowlist of dir names for loaded plugins to prevent path traversal.
  const pluginDirMap = new Map(userPlugins.map(p => [p.dirName, p.pluginDir]));
  const hostLibsDir = path.join(__dirname, '../host');

  protocol.handle('sessionry', request => {
    const url = new URL(request.url);

    if (url.host === 'host') {
      const rel = url.pathname.slice(1); // strip leading '/'
      const filePath = path.resolve(hostLibsDir, rel);
      if (!filePath.startsWith(hostLibsDir + path.sep) && filePath !== hostLibsDir) {
        return new Response('Not found', { status: 404 });
      }
      return net.fetch(pathToFileURL(filePath).href);
    }

    if (url.host === 'plugin') {
      const segments = url.pathname.slice(1).split('/');
      const dirName = segments[0];
      const rest = segments.slice(1);
      const pluginDir = pluginDirMap.get(dirName);
      if (!pluginDir || rest.length === 0) return new Response('Not found', { status: 404 });
      const filePath = path.resolve(pluginDir, ...rest);
      if (!filePath.startsWith(pluginDir + path.sep)) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(pathToFileURL(filePath).href);
    }

    return new Response('Not found', { status: 404 });
  });

  const workspaceStorePath = path.join(app.getPath('userData'), 'workspace.json');
  const workspaceStore = new WorkspaceStore(workspaceStorePath);
  const workspaceApi = createWorkspaceApi({
    read: () => workspaceStore.read(),
    executeCommand: (command: WorkspaceCommand) => workspaceStore.executeCommand(command),
    subscribeAll: listener => workspaceStore.subscribeAll(listener)
  });
  const vcsService = createVcsService();
  const allPlugins = [...enabledBuiltInPlugins, ...userPlugins.map(p => p.plugin)];
  const actionRegistry = new ActionRegistry(allPlugins, workspaceApi, () => workspaceStore.read());

  const ipcApi: PluginIpcApi = {
    handle: (channel, handler) => ipcMain.handle(channel, (_event, ...args) => handler(...args)),
    on: (channel, handler) => ipcMain.on(channel, (_event, ...args) => handler(...args)),
    emit: (channel, ...args) => mainWindow?.webContents.send(channel, ...args)
  };

  const pluginManager = createPluginManager(
    {
      workspace: workspaceApi,
      ipc: ipcApi,
      vcs: {
        registerProvider: provider => vcsService.registerProvider(provider)
      },
      settings: settingsStore.read(),
      onBeforeQuit: handler => app.on('before-quit', handler)
    },
    enabledBuiltInPlugins,
    userPlugins.map(p => p.plugin)
  );

  workspaceStore.subscribeAll((event: WorkspaceEvent) => {
    mainWindow?.webContents.send(IPC_CHANNELS.workspaceEvent, event);
  });

  ipcMain.handle(IPC_CHANNELS.pluginModel, () => pluginManager.getViewModel());
  ipcMain.handle(IPC_CHANNELS.userPluginRenderers, () =>
    userPlugins
      .filter(p => p.manifest.renderer != null)
      .map(p => ({
        pluginId: p.manifest.id,
        rendererUrl: `sessionry://plugin/${p.dirName}/${p.manifest.renderer}`
      }))
  );
  ipcMain.handle(IPC_CHANNELS.actionsList, () => actionRegistry.list());
  ipcMain.handle(IPC_CHANNELS.actionsExecute, (_event, request) => actionRegistry.execute(request));
  ipcMain.on(IPC_CHANNELS.workspaceRead, event => {
    event.returnValue = workspaceStore.read();
  });
  ipcMain.handle(IPC_CHANNELS.workspaceCommand, (_event, command: WorkspaceCommand) =>
    workspaceStore.executeCommand(command)
  );
  ipcMain.handle(IPC_CHANNELS.openExternal, (_event, url: string) => shell.openExternal(url));
  ipcMain.handle(IPC_CHANNELS.showFolderDialog, () =>
    dialog.showOpenDialog(mainWindow!, { properties: ['openDirectory', 'createDirectory'] })
  );
  ipcMain.handle(IPC_CHANNELS.readDirectory, (_event, dirPath: string) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map(e => ({ name: e.name, isDirectory: e.isDirectory() }));
  });
  ipcMain.handle(IPC_CHANNELS.readFile, (_event, filePath: string) =>
    fs.readFileSync(filePath, 'utf-8')
  );
  ipcMain.handle(IPC_CHANNELS.writeFile, (_event, filePath: string, content: string) =>
    fs.writeFileSync(filePath, content, 'utf-8')
  );
  ipcMain.handle(IPC_CHANNELS.vcsStatus, (_event, dirPath: string, options?: { bypassCache?: boolean }) =>
    vcsService.getStatus(dirPath, options)
  );
  ipcMain.handle(IPC_CHANNELS.vcsDiff, (_event, dirPath: string, file) =>
    vcsService.getDiff(dirPath, file)
  );
  ipcMain.handle(IPC_CHANNELS.vcsStageFiles, (_event, dirPath: string, files) =>
    vcsService.stageFiles(dirPath, files)
  );
  ipcMain.handle(IPC_CHANNELS.vcsCommit, (_event, dirPath: string, message: string) =>
    vcsService.commit(dirPath, message)
  );
  ipcMain.handle(IPC_CHANNELS.settingsRead, () => settingsStore.read());
  ipcMain.on(IPC_CHANNELS.settingsRead, event => {
    event.returnValue = settingsStore.read();
  });
  ipcMain.handle(IPC_CHANNELS.settingsUpdate, (_event, updates) => {
    settingsStore.update(updates);
    mainWindow?.webContents.send('settings:changed', settingsStore.read());
  });

  // Plugin management IPC handlers
  ipcMain.handle(IPC_CHANNELS.pluginManagementList, () => pluginConfigStore.getInstalledPlugins());
  ipcMain.handle(IPC_CHANNELS.pluginManagementEnable, async (_event, pluginId: string) => {
    pluginConfigStore.enablePlugin(pluginId);
    settingsStore.update({ pluginManagement: pluginConfigStore.getConfig() });
    return { success: true, requiresRestart: true };
  });
  ipcMain.handle(IPC_CHANNELS.pluginManagementDisable, async (_event, pluginId: string) => {
    pluginConfigStore.disablePlugin(pluginId);
    settingsStore.update({ pluginManagement: pluginConfigStore.getConfig() });
    return { success: true, requiresRestart: true };
  });
  ipcMain.handle(IPC_CHANNELS.pluginManagementGetConfig, () => pluginConfigStore.getConfig());

  // Register theme IPC handlers
  registerThemeHandlers();

  // Register plugin manager IPC handlers
  registerPluginManagerHandlers(pluginConfigStore, settingsStore, mainWindow, builtInPlugins);

  const createMenu = () => {
    const settings = settingsStore.read();
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
          { type: 'separator' },
          {
            label: 'Toggle Status Bar',
            type: 'checkbox',
            checked: settings.statusBarVisible,
            click: () => {
              const currentSettings = settingsStore.read();
              settingsStore.update({ statusBarVisible: !currentSettings.statusBarVisible });
              mainWindow?.webContents.send('settings:changed', settingsStore.read());
              createMenu();
            }
          }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          ...(process.platform === 'darwin'
            ? [
                { type: 'separator' as const },
                { role: 'front' as const },
                { type: 'separator' as const },
                { role: 'window' as const }
              ]
            : [{ role: 'close' as const }])
        ]
      }
    ];

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
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  };

  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
