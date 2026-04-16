import type { RendererPluginViewDefinition } from '@shared/plugins'

import { defaultWorkspacePaneRendererPlugin } from './defaultWorkspacePanePlugin'

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
