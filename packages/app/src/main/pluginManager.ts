import type { AppPlugin, MainPluginContext } from '@sessionry/plugin-api'
import { normalizePlugins } from '@sessionry/plugin-api'

import { builtInPlugins } from './plugins'

export const createPluginManager = (context: MainPluginContext, userPlugins: AppPlugin[] = []) => {
  const allPlugins = [...builtInPlugins, ...userPlugins]

  for (const plugin of allPlugins) {
    void plugin.activateMain?.(context)
  }

  return {
    getViewModel: () => normalizePlugins(allPlugins)
  }
}
