import type { AppPlugin, MainPluginContext } from '@sessionry/plugin-api'
import { normalizePlugins } from '@sessionry/plugin-api'

import { builtInPlugins } from './plugins'
import { themeRegistry } from './themeRegistry'

export const createPluginManager = (context: MainPluginContext, userPlugins: AppPlugin[] = []) => {
  const allPlugins = [...builtInPlugins, ...userPlugins]

  for (const plugin of allPlugins) {
    // Register themes if plugin provides them
    if (plugin.themes && plugin.themes.length > 0) {
      themeRegistry.registerThemes(plugin.id, plugin.themes)
    }
    
    void plugin.activateMain?.(context)
  }

  return {
    getViewModel: () => normalizePlugins(allPlugins)
  }
}
