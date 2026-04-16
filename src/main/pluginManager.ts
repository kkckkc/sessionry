import type { MainPluginContext } from '@shared/plugins'
import { normalizePlugins } from '@shared/pluginRegistry'

import { builtInPlugins } from './plugins'

export const createPluginManager = (context: MainPluginContext) => {
  for (const plugin of builtInPlugins) {
    void plugin.activateMain?.(context)
  }

  return {
    getViewModel: () => normalizePlugins(builtInPlugins)
  }
}
