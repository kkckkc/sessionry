/**
 * Plugin Manager IPC Handlers
 *
 * Handles IPC communication for plugin management operations.
 */

import { ipcMain } from 'electron';
import type { AppPlugin } from '@sessionry/plugin-api';
import { PluginManagerService } from '../npm/pluginManagerService';
import type { PluginConfigStore } from '../pluginConfigStore';
import type { SettingsStore } from '../settingsStore';

const BUILTIN_CORE_PLUGIN_ID = 'core';

/**
 * Register plugin manager IPC handlers
 */
export function registerPluginManagerHandlers(
  pluginConfigStore: PluginConfigStore,
  settingsStore: SettingsStore,
  mainWindow: Electron.BrowserWindow | null,
  builtInPlugins: AppPlugin[],
  userPlugins: AppPlugin[] = []
) {
  // Create plugin manager service instance
  const pluginManagerService = new PluginManagerService();
  const userPluginById = new Map(userPlugins.map(plugin => [plugin.id, plugin]));

  // Set up progress event forwarding
  pluginManagerService.on('install:progress', (_packageName, downloaded, total) => {
    const payload = { downloaded, total };
    mainWindow?.webContents.send('plugin:install:progress', payload);
    mainWindow?.webContents.send('plugin:update:progress', payload);
  });

  /**
   * Search for plugins
   */
  ipcMain.handle('plugin:search', async (_event, options: { query: string; size?: number }) => {
    try {
      return await pluginManagerService.searchPlugins({
        query: options.query,
        size: options.size
      });
    } catch (error) {
      console.error('Plugin search failed:', error);
      throw error;
    }
  });

  /**
   * Install a plugin
   */
  ipcMain.handle(
    'plugin:install',
    async (_event, options: { packageName: string; version?: string }) => {
      try {
        const result = await pluginManagerService.installPlugin(
          options.packageName,
          options.version
        );

        // Update settings store with new plugin configuration
        settingsStore.update({
          pluginManagement: pluginConfigStore.getConfig()
        });

        return {
          success: true,
          pluginId: result.pluginId,
          requiresRestart: true
        };
      } catch (error) {
        console.error('Plugin installation failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Installation failed'
        };
      }
    }
  );

  /**
   * Uninstall a plugin
   */
  ipcMain.handle('plugin:uninstall', async (_event, options: { pluginId: string }) => {
    try {
      const plugin = pluginConfigStore.getPlugin(options.pluginId);
      if (plugin?.source === 'builtin') {
        throw new Error('Built-in plugins cannot be uninstalled');
      }

      const success = await pluginManagerService.uninstallPlugin(options.pluginId);

      if (success) {
        // Update settings store with new plugin configuration
        settingsStore.update({
          pluginManagement: pluginConfigStore.getConfig()
        });
      }

      return success;
    } catch (error) {
      console.error('Plugin uninstallation failed:', error);
      throw error;
    }
  });

  /**
   * Update a plugin
   */
  ipcMain.handle(
    'plugin:update',
    async (_event, options: { pluginId: string; packageName: string }) => {
      try {
        const result = await pluginManagerService.updatePlugin(
          options.pluginId,
          options.packageName
        );

        // Update settings store with new plugin configuration
        settingsStore.update({
          pluginManagement: pluginConfigStore.getConfig()
        });

        return {
          success: true,
          pluginId: result.pluginId,
          version: result.version,
          requiresRestart: true
        };
      } catch (error) {
        console.error('Plugin update failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Update failed'
        };
      }
    }
  );

  /**
   * Check for plugin updates
   */
  ipcMain.handle('plugin:check-updates', async () => {
    try {
      const installedPlugins = pluginConfigStore.getInstalledPlugins();

      // Check updates for all installed plugins
      const updateChecks = await Promise.allSettled(
        installedPlugins
          .filter(plugin => typeof plugin.package === 'string')
          .map(plugin =>
            pluginManagerService.checkForUpdates(plugin.id, plugin.package!, plugin.version)
          )
      );

      // Return only successful checks
      return (
        updateChecks
          // biome-ignore lint/suspicious/noExplicitAny: PromiseSettledResult generic requires any for heterogeneous results
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value)
      );
    } catch (error) {
      console.error('Update check failed:', error);
      throw error;
    }
  });

  /**
   * List installed plugins
   */
  ipcMain.handle('plugin:list', async () => {
    try {
      // Get built-in plugins
      const builtinPluginList = builtInPlugins.map(plugin => ({
        id: plugin.id,
        name: plugin.name || plugin.id,
        version: '1.0.0', // Built-in version matches app version
        description: undefined,
        author: 'Sessionry',
        keywords: [],
        source: 'builtin' as const,
        installed: true,
        enabled:
          plugin.id === BUILTIN_CORE_PLUGIN_ID
            ? true
            : pluginConfigStore.isPluginEnabled(plugin.id),
        canDisable: plugin.id !== BUILTIN_CORE_PLUGIN_ID,
        canUninstall: false, // Cannot be uninstalled
        unsafeIpc: plugin.unsafeIpc === true,
        ipcApproved: true,
        updateAvailable: false
      }));

      // Get user-installed plugins
      const installedPlugins = pluginConfigStore.getInstalledPlugins();
      const userPluginList = installedPlugins
        .filter(plugin => plugin.source !== 'builtin')
        .map(plugin => ({
          id: plugin.id,
          name: plugin.package || plugin.id,
          version: plugin.version,
          description: undefined,
          author: undefined,
          keywords: undefined,
          source: plugin.source,
          installed: true,
          enabled: plugin.enabled,
          canDisable: true,
          canUninstall: true,
          unsafeIpc: userPluginById.get(plugin.id)?.unsafeIpc === true,
          ipcApproved: plugin.ipcApproved === true,
          updateAvailable: false // Will be populated by check-updates
        }));

      // Return built-in plugins first, then user plugins
      return [...builtinPluginList, ...userPluginList];
    } catch (error) {
      console.error('Failed to list plugins:', error);
      throw error;
    }
  });

  /**
   * Enable a plugin
   */
  ipcMain.handle('plugin:enable', async (_event, options: { pluginId: string }) => {
    try {
      pluginConfigStore.enablePlugin(options.pluginId);
      settingsStore.update({
        pluginManagement: pluginConfigStore.getConfig()
      });
      return { success: true, requiresRestart: true };
    } catch (error) {
      console.error('Failed to enable plugin:', error);
      throw error;
    }
  });

  /**
   * Disable a plugin
   */
  ipcMain.handle('plugin:disable', async (_event, options: { pluginId: string }) => {
    try {
      const plugin = pluginConfigStore.getPlugin(options.pluginId);
      if (plugin?.source === 'builtin' && plugin.id === BUILTIN_CORE_PLUGIN_ID) {
        throw new Error('The Core plugin cannot be disabled');
      }

      pluginConfigStore.disablePlugin(options.pluginId);
      settingsStore.update({
        pluginManagement: pluginConfigStore.getConfig()
      });
      return { success: true, requiresRestart: true };
    } catch (error) {
      console.error('Failed to disable plugin:', error);
      throw error;
    }
  });
}
