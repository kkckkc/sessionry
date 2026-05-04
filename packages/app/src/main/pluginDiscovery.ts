import fs from 'node:fs'
import path from 'node:path'
import type { InstalledPlugin } from '@sessionry/plugin-api'
import type { PluginManifest } from './pluginLoader'
import { getUserPluginsDir } from './pluginLoader'

/**
 * Discovers all plugins in the user plugins directory and returns them as InstalledPlugin entries.
 * This is used to auto-register local plugins in the configuration.
 */
export const discoverLocalPlugins = (): InstalledPlugin[] => {
  const pluginsDir = getUserPluginsDir()
  if (!fs.existsSync(pluginsDir)) {
    return []
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true })
  const discovered: InstalledPlugin[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    
    const pluginDir = path.join(pluginsDir, entry.name)
    const manifestPath = path.join(pluginDir, 'plugin.json')
    
    if (!fs.existsSync(manifestPath)) continue

    try {
      const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      
      discovered.push({
        id: manifest.id,
        source: 'local',
        version: manifest.version,
        enabled: true, // Enable by default for newly discovered plugins
        path: pluginDir
      })
    } catch (err) {
      console.error(`[plugin-discovery] Failed to read manifest from ${pluginDir}:`, err)
    }
  }

  return discovered
}

/**
 * Syncs the plugin configuration with discovered local plugins.
 * - Adds newly discovered plugins
 * - Preserves enabled/disabled state for existing plugins
 * - Removes plugins that no longer exist
 */
export const syncPluginConfiguration = (
  currentConfig: InstalledPlugin[]
): InstalledPlugin[] => {
  const discovered = discoverLocalPlugins()
  const configMap = new Map(currentConfig.map((p) => [p.id, p]))
  const discoveredMap = new Map(discovered.map((p) => [p.id, p]))
  
  const synced: InstalledPlugin[] = []
  
  // Add or update discovered plugins
  for (const plugin of discovered) {
    const existing = configMap.get(plugin.id)
    if (existing) {
      // Preserve enabled state and update version/path
      synced.push({
        ...existing,
        version: plugin.version,
        path: plugin.path
      })
    } else {
      // New plugin, add with default enabled state
      synced.push(plugin)
      console.log(`[plugin-discovery] Discovered new plugin: ${plugin.id}`)
    }
  }
  
  // Keep npm plugins from config (they're not discovered locally)
  for (const plugin of currentConfig) {
    if ((plugin.source === 'npm' || plugin.source === 'builtin') && !discoveredMap.has(plugin.id)) {
      synced.push(plugin)
    }
  }
  
  return synced
}
