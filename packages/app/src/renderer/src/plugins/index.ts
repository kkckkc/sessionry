import type { RendererPluginViewDefinition } from '@sessionry/plugin-api'
import { defaultWorkspacePaneRendererPlugin } from '@sessionry/default-workspace-pane-plugin/renderer'

const builtInRendererPlugins = [defaultWorkspacePaneRendererPlugin]

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
