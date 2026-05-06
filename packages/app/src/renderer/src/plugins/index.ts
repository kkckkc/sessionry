import type { RendererAppPlugin, RendererViewRegistration } from '@sessionry/plugin-api';
import { debugPaneHierarchyRendererPlugin } from '@sessionry/plugin-debug-view-pane-hierarchy/renderer';
import { codePaneRendererPlugin } from '@sessionry/plugin-default-view-code/renderer';
import { defaultWorkspacePaneRendererPlugin } from '@sessionry/plugin-default-view-workspace/renderer';
import { projectSessionsSidebarRendererPlugin } from '@sessionry/plugin-default-view-left-sidebar/renderer';
import { sidebarTabBarRendererPlugin } from '@sessionry/plugin-default-view-sidebar-tabbar/renderer';
import { terminalPaneRendererPlugin } from '@sessionry/plugin-default-view-terminal/renderer';
import { fileBrowserRendererPlugin } from '@sessionry/plugin-default-view-files/renderer';
import { vcsViewRendererPlugin } from '@sessionry/plugin-default-view-vcs/renderer';
import { coreRendererPlugin } from './coreRendererPlugin';

const builtInRendererPlugins = [
  coreRendererPlugin,
  codePaneRendererPlugin,
  terminalPaneRendererPlugin,
  defaultWorkspacePaneRendererPlugin,
  projectSessionsSidebarRendererPlugin,
  sidebarTabBarRendererPlugin,
  fileBrowserRendererPlugin,
  vcsViewRendererPlugin,
  debugPaneHierarchyRendererPlugin
];

const rendererViews = builtInRendererPlugins.flatMap(plugin =>
  (plugin.views ?? []).map(view => ({
    ...view,
    pluginId: plugin.id
  }))
);

type RegisteredRendererView = RendererViewRegistration & { pluginId: string };

const rendererViewById = new Map<string, RegisteredRendererView>(
  rendererViews.map(view => [view.id, view])
);

// Also register settings views
for (const plugin of builtInRendererPlugins) {
  if (plugin.settingsView) {
    rendererViewById.set(plugin.settingsView.id, {
      ...plugin.settingsView,
      pluginId: plugin.id
    });
  }
}

export const getRendererView = (viewId: string): RegisteredRendererView | null =>
  rendererViewById.get(viewId) ?? null;

/** Loads renderer bundles for user-installed plugins and registers their views. */
export const loadUserPluginRenderers = async (): Promise<void> => {
  const infos = await window.terminalApp.getUserPluginRenderers();
  for (const { pluginId, rendererUrl } of infos) {
    try {
      const mod = await import(/* @vite-ignore */ rendererUrl);
      const plugin: RendererAppPlugin = mod.default;
      for (const view of plugin.views ?? []) {
        rendererViewById.set(view.id, { ...view, pluginId });
      }
    } catch (err) {
      console.error(`[plugin-loader] Failed to load renderer for plugin ${pluginId}:`, err);
    }
  }
};
