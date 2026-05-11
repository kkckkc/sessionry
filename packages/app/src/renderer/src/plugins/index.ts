import type {
  PaneCreationContext,
  PaneCreationContributionModel,
  RendererAppPlugin,
  RendererPluginSettingsViewDefinition,
  RendererViewRegistration
} from '@sessionry/plugin-api';
import { debugPaneHierarchyRendererPlugin } from '@sessionry/plugin-debug-view-pane-hierarchy/renderer';
import terminalPresetsRendererPlugin from '@sessionry/plugin-default-terminal-presets/renderer';
import { codePaneRendererPlugin } from '@sessionry/plugin-default-view-code/renderer';
import { defaultWorkspacePaneRendererPlugin } from '@sessionry/plugin-default-view-workspace/renderer';
import { projectSessionsSidebarRendererPlugin } from '@sessionry/plugin-default-view-left-sidebar/renderer';
import { sidebarTabBarRendererPlugin } from '@sessionry/plugin-default-view-sidebar-tabbar/renderer';
import { terminalPaneRendererPlugin } from '@sessionry/plugin-default-view-terminal/renderer';
import { fileBrowserRendererPlugin } from '@sessionry/plugin-default-view-files/renderer';
import { vcsViewRendererPlugin } from '@sessionry/plugin-default-view-vcs/renderer';
import { notesViewRendererPlugin } from '@sessionry/plugin-default-view-notes/renderer';
import chatRendererPlugin from '@sessionry/plugin-default-view-chat/renderer';
import { coreRendererPlugin } from './coreRendererPlugin';

const builtInRendererPlugins = [
  coreRendererPlugin,
  codePaneRendererPlugin,
  terminalPresetsRendererPlugin,
  terminalPaneRendererPlugin,
  chatRendererPlugin,
  defaultWorkspacePaneRendererPlugin,
  projectSessionsSidebarRendererPlugin,
  sidebarTabBarRendererPlugin,
  fileBrowserRendererPlugin,
  vcsViewRendererPlugin,
  notesViewRendererPlugin,
  debugPaneHierarchyRendererPlugin
];

const rendererViews = builtInRendererPlugins.flatMap(plugin =>
  (plugin.views ?? []).map(view => ({
    ...view,
    pluginId: plugin.id
  }))
);

export type RegisteredRendererView = RendererViewRegistration & { pluginId: string };
export type RegisteredRendererSettingsView = RendererPluginSettingsViewDefinition & { pluginId: string };

const rendererViewById = new Map<string, RegisteredRendererView>(
  rendererViews.map(view => [view.id, view])
);

const rendererSettingsViewById = new Map<string, RegisteredRendererSettingsView>();
const paneCreationProviders = new Map<
  string,
  NonNullable<RendererAppPlugin['providePaneCreations']>
>();

const registerPluginSettingsView = (plugin: RendererAppPlugin): void => {
  if (!plugin.settingsView) {
    return;
  }

  rendererSettingsViewById.set(plugin.settingsView.id, {
    ...plugin.settingsView,
    pluginId: plugin.id
  });
};

const registerPaneCreationProvider = (plugin: RendererAppPlugin): void => {
  if (!plugin.providePaneCreations) return;
  paneCreationProviders.set(plugin.id, plugin.providePaneCreations);
};

// Also register settings views
for (const plugin of builtInRendererPlugins) {
  registerPluginSettingsView(plugin);
  registerPaneCreationProvider(plugin);

  if (plugin.settingsView) {
    rendererViewById.set(plugin.settingsView.id, {
      ...plugin.settingsView,
      pluginId: plugin.id
    });
  }
}

export const getRendererView = (viewId: string): RegisteredRendererView | null =>
  rendererViewById.get(viewId) ?? null;

export const getRendererSettingsViews = (): RegisteredRendererSettingsView[] =>
  Array.from(rendererSettingsViewById.values());

export const getDynamicPaneCreations = async (
  context: PaneCreationContext
): Promise<PaneCreationContributionModel[]> => {
  const results = await Promise.all(
    Array.from(paneCreationProviders.entries()).map(async ([pluginId, provider]) => {
      try {
        return (await provider(context)).map(entry => ({
          ...entry,
          pluginId
        }));
      } catch (err) {
        console.error(`[plugin-loader] Failed to resolve pane creations for plugin ${pluginId}:`, err);
        return [];
      }
    })
  );

  return results.flat();
};

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
      const pluginWithResolvedId = {
        ...plugin,
        id: pluginId
      };
      registerPluginSettingsView(pluginWithResolvedId);
      registerPaneCreationProvider(pluginWithResolvedId);
    } catch (err) {
      console.error(`[plugin-loader] Failed to load renderer for plugin ${pluginId}:`, err);
    }
  }
};
