import type { MainPluginContext } from '@sessionry/plugin-api'
import { normalizePlugins } from '@sessionry/plugin-api'

import { builtInPlugins } from './plugins'

export const createPluginManager = (context: MainPluginContext) => {
  for (const plugin of builtInPlugins) {
    void plugin.activateMain?.(context)
  }

  return {
    getViewModel: () => normalizePlugins(builtInPlugins)
  }
}
