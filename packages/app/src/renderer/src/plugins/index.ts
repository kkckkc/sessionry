import type { RendererAppPlugin, RendererPluginViewDefinition } from '@sessionry/plugin-api'
import { defaultWorkspacePaneRendererPlugin } from '@sessionry/plugin-default-view-workspace/renderer'
import { projectSessionsSidebarRendererPlugin } from '@sessionry/plugin-default-view-left-sidebar/renderer'
import { terminalPaneRendererPlugin } from '@sessionry/plugin-default-view-terminal/renderer'

const builtInRendererPlugins = [
  terminalPaneRendererPlugin,
  defaultWorkspacePaneRendererPlugin,
  projectSessionsSidebarRendererPlugin
]

const rendererViews = builtInRendererPlugins.flatMap((plugin) =>
  (plugin.views ?? []).map((view) => ({
    ...view,
    pluginId: plugin.id
  }))
)

const rendererViewById = new Map(rendererViews.map((view) => [view.id, view]))

export const getRendererView = (
  viewId: string
): (RendererPluginViewDefinition & { pluginId: string }) | null => rendererViewById.get(viewId) ?? null

/** Loads renderer bundles for user-installed plugins and registers their views. */
export const loadUserPluginRenderers = async (): Promise<void> => {
  const infos = await window.terminalApp.getUserPluginRenderers()
  for (const { pluginId, rendererUrl } of infos) {
    try {
      const mod = await import(/* @vite-ignore */ rendererUrl)
      const plugin: RendererAppPlugin = mod.default
      for (const view of plugin.views ?? []) {
        rendererViewById.set(view.id, { ...view, pluginId })
      }
    } catch (err) {
      console.error(`[plugin-loader] Failed to load renderer for plugin ${pluginId}:`, err)
    }
  }
}
