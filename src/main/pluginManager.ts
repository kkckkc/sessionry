import { normalizePlugins } from '@shared/pluginRegistry'

import { builtInPlugins } from './plugins'

export const createPluginManager = () => {
  for (const plugin of builtInPlugins) {
    plugin.activateMain?.()
  }

  return {
    getViewModel: () => normalizePlugins(builtInPlugins)
  }
}
