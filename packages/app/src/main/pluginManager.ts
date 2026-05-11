import type { AppPlugin, MainPluginContext, PluginIpcApi } from '@sessionry/plugin-api';
import { normalizePlugins } from '@sessionry/plugin-api';

import { themeRegistry } from './themeRegistry';

const createBlockedIpcApi = (pluginId: string): PluginIpcApi => ({
  handle: (channel) => {
    console.warn(
      `[plugin-manager] ${pluginId}: blocked ipc.handle("${channel}") — unsafeIpc not approved`
    );
  },
  on: (channel) => {
    console.warn(
      `[plugin-manager] ${pluginId}: blocked ipc.on("${channel}") — unsafeIpc not approved`
    );
  },
  emit: (channel) => {
    console.warn(
      `[plugin-manager] ${pluginId}: blocked ipc.emit("${channel}") — unsafeIpc not approved`
    );
  }
});

export const createPluginManager = (
  context: MainPluginContext,
  builtInPlugins: AppPlugin[] = [],
  userPlugins: AppPlugin[] = [],
  ipcApprovedPluginIds: Set<string> = new Set()
) => {
  const allPlugins = [...builtInPlugins, ...userPlugins];

  for (const plugin of allPlugins) {
    // Register themes if plugin provides them
    if (plugin.themes && plugin.themes.length > 0) {
      themeRegistry.registerThemes(plugin.id, plugin.themes);
    }

    // Built-in plugins are always trusted. User plugins with unsafeIpc
    // need explicit approval to receive a working IPC context.
    const isBuiltIn = builtInPlugins.includes(plugin);
    const needsIpcGate = !isBuiltIn && plugin.unsafeIpc === true;
    const isApproved = !needsIpcGate || ipcApprovedPluginIds.has(plugin.id);

    if (needsIpcGate && !isApproved) {
      console.warn(
        `[plugin-manager] ${plugin.id}: requires unsafeIpc but not approved — IPC handlers blocked`
      );
    }

    const pluginContext = isApproved
      ? context
      : { ...context, ipc: createBlockedIpcApi(plugin.id) };

    void plugin.activateMain?.(pluginContext);
  }

  return {
    getViewModel: () => normalizePlugins(allPlugins)
  };
};
