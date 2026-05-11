import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  shell
} from 'electron';
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
import { loadUserPlugins, loadLocalDevPlugins } from './pluginLoader';
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

// Set app name for macOS menu (affects both dev and production)
app.setName('Sessionry');

// Get icon path - works in both dev and production
const getIconPath = () => {
  const iconName = process.platform === 'darwin' ? 'sessionry.icns' : 'sessionry-icon-512.png';
  
  if (app.isPackaged) {
    // In production, icons should be in the resources directory
    return path.join(process.resourcesPath, 'icons', iconName);
  }
  
  // In development, use app.getAppPath() to get the project root
  const iconPath = path.join(app.getAppPath(), 'icons', iconName);
  return iconPath;
};

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#0d1118',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 12 },
    icon: getIconPath(),
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
  // Set dock icon for development mode on macOS
  if (process.platform === 'darwin' && !app.isPackaged) {
    const iconPath = path.join(app.getAppPath(), 'icons', 'sessionry-1024x1024-padded.png');
    if (fs.existsSync(iconPath) && app.dock) {
      app.dock.setIcon(iconPath);
    }
  }

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
  const localDevPlugins = await loadLocalDevPlugins(pluginConfigStore);
  const enabledBuiltInPlugins = builtInPlugins.filter(
    plugin => plugin.id === BUILTIN_CORE_PLUGIN_ID || pluginConfigStore.isPluginEnabled(plugin.id)
  );

  // Combine user and local dev plugins
  const allUserPlugins = [...userPlugins, ...localDevPlugins];

  // Build an allowlist of dir names for loaded plugins to prevent path traversal.
  const pluginDirMap = new Map(allUserPlugins.map(p => [p.dirName, p.pluginDir]));
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
      
      // Try to match plugin directory - could be single segment or repo/plugin format
      let pluginDir: string | undefined;
      let rest: string[];
      
      // First try two-segment format (repo/plugin) for local dev plugins
      if (segments.length >= 2) {
        const twoSegmentKey = `${segments[0]}/${segments[1]}`;
        pluginDir = pluginDirMap.get(twoSegmentKey);
        if (pluginDir) {
          rest = segments.slice(2);
        }
      }
      
      // Fall back to single segment format for regular user plugins
      if (!pluginDir && segments.length >= 1) {
        pluginDir = pluginDirMap.get(segments[0]);
        rest = segments.slice(1);
      }
      
      if (!pluginDir || rest.length === 0) {
        return new Response('Not found', { status: 404 });
      }
      
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
  const allPlugins = [...enabledBuiltInPlugins, ...allUserPlugins.map(p => p.plugin)];
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
    allUserPlugins.map(p => p.plugin)
  );

  // Helper function to update window title based on active project
  const updateWindowTitle = () => {
    if (!mainWindow) return;
    
    const state = workspaceStore.read();
    if (!state.activeSessionId) {
      mainWindow.setTitle('Sessionry');
      return;
    }
    
    const activeSession = state.sessions.find(s => s.id === state.activeSessionId);
    if (!activeSession) {
      mainWindow.setTitle('Sessionry');
      return;
    }
    
    const project = state.projects.find(p => p.id === activeSession.projectId);
    const projectName = project?.name || 'Unknown Project';
    mainWindow.setTitle(`Sessionry: ${projectName}`);
  };

  workspaceStore.subscribeAll((event: WorkspaceEvent) => {
    mainWindow?.webContents.send(IPC_CHANNELS.workspaceEvent, event);
    
    // Update window title when active session changes
    if (event.type === 'session.activated') {
      updateWindowTitle();
    }
  });

  ipcMain.handle(IPC_CHANNELS.pluginModel, () => pluginManager.getViewModel());
  ipcMain.handle(IPC_CHANNELS.userPluginRenderers, () =>
    allUserPlugins
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
  ipcMain.handle(IPC_CHANNELS.deleteFile, (_event, filePath: string) =>
    fs.unlinkSync(filePath)
  );
  ipcMain.handle(IPC_CHANNELS.createDirectory, (_event, dirPath: string) =>
    fs.mkdirSync(dirPath, { recursive: true })
  );
  ipcMain.handle(
    IPC_CHANNELS.vcsStatus,
    (_event, dirPath: string, options?: { bypassCache?: boolean }) =>
      vcsService.getStatus(dirPath, options)
  );
  ipcMain.handle(IPC_CHANNELS.vcsDiff, (_event, dirPath: string, file) =>
    vcsService.getDiff(dirPath, file)
  );
  ipcMain.handle(IPC_CHANNELS.vcsStageFiles, (_event, dirPath: string, files) =>
    vcsService.stageFiles(dirPath, files)
  );
  ipcMain.handle(IPC_CHANNELS.vcsRevertFiles, (_event, dirPath: string, files) =>
    vcsService.revertFiles(dirPath, files)
  );
  ipcMain.handle(IPC_CHANNELS.vcsCommit, (_event, dirPath: string, message: string) =>
    vcsService.commit(dirPath, message)
  );
  ipcMain.handle(IPC_CHANNELS.vcsPush, (_event, dirPath: string) => vcsService.push(dirPath));
  ipcMain.handle(IPC_CHANNELS.vcsPull, (_event, dirPath: string) => vcsService.pull(dirPath));

  ipcMain.handle(IPC_CHANNELS.vcsCreatePullRequest, (_event, dirPath: string) =>
    vcsService.createPullRequest(dirPath)
  );
  ipcMain.handle(IPC_CHANNELS.vcsCreateBranch, (_event, dirPath: string, branchName: string) =>
    vcsService.createBranch(dirPath, branchName)
  );
  ipcMain.handle(IPC_CHANNELS.vcsListBranches, (_event, dirPath: string) =>
    vcsService.listBranches(dirPath)
  );
  ipcMain.handle(IPC_CHANNELS.vcsSwitchBranch, (_event, dirPath: string, branchName: string) =>
    vcsService.switchBranch(dirPath, branchName)
  );

  ipcMain.handle(IPC_CHANNELS.settingsRead, () => settingsStore.read());
  ipcMain.on(IPC_CHANNELS.settingsRead, event => {
    event.returnValue = settingsStore.read();
  });
  ipcMain.handle(IPC_CHANNELS.settingsUpdate, (_event, updates) => {
    settingsStore.update(updates);
    mainWindow?.webContents.send('settings:changed', settingsStore.read());

    // Notify all windows if keybindings changed
    if (updates.keybindings) {
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.keybindingsReload, updates.keybindings);
      });
    }
  });

  // Clipboard IPC handlers
  ipcMain.handle('clipboard:readText', () => clipboard.readText());
  ipcMain.handle('clipboard:writeText', (_event, text: string) => clipboard.writeText(text));

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
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          ...(process.platform === 'darwin'
            ? [
                { role: 'pasteAndMatchStyle' as const },
                { role: 'delete' as const },
                { role: 'selectAll' as const },
                { type: 'separator' as const },
                {
                  label: 'Speech',
                  submenu: [
                    { role: 'startSpeaking' as const },
                    { role: 'stopSpeaking' as const }
                  ]
                }
              ]
            : [
                { role: 'delete' as const },
                { type: 'separator' as const },
                { role: 'selectAll' as const }
              ])
        ]
      },
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

  createWindow();
  createMenu();
  
  // Set initial window title based on active project
  updateWindowTitle();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
