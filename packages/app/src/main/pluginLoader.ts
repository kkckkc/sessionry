import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { AppPlugin } from '@sessionry/plugin-api'

export interface PluginManifest {
  id: string
  name: string
  version: string
  main: string
  renderer?: string
}

export interface LoadedUserPlugin {
  manifest: PluginManifest
  pluginDir: string
  dirName: string
  plugin: AppPlugin
}

export const getUserPluginsDir = (): string => path.join(os.homedir(), 'sessionry', 'plugins')

export const loadUserPlugins = async (): Promise<LoadedUserPlugin[]> => {
  const pluginsDir = getUserPluginsDir()
  if (!fs.existsSync(pluginsDir)) return []

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true })
  const loaded: LoadedUserPlugin[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const pluginDir = path.join(pluginsDir, entry.name)
    const manifestPath = path.join(pluginDir, 'plugin.json')
    if (!fs.existsSync(manifestPath)) continue

    try {
      const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      const mainPath = path.resolve(pluginDir, manifest.main)
      if (!mainPath.startsWith(pluginDir + path.sep)) {
        console.error(`[plugin-loader] ${manifest.id}: main path escapes plugin directory, skipping`)
        continue
      }
      const mod = await import(pathToFileURL(mainPath).href)
      const plugin: AppPlugin = mod.default
      loaded.push({ manifest, pluginDir, dirName: entry.name, plugin })
    } catch (err) {
      console.error(`[plugin-loader] Failed to load plugin from ${pluginDir}:`, err)
    }
  }

  return loaded
}
