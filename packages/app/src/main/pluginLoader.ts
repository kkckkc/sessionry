import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { AppPlugin } from '@sessionry/plugin-api';
import type { PluginConfigStore } from './pluginConfigStore';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  main: string;
  renderer?: string;
}

export interface LoadedUserPlugin {
  manifest: PluginManifest;
  pluginDir: string;
  dirName: string;
  plugin: AppPlugin;
}

export const getUserPluginsDir = (): string => path.join(os.homedir(), 'sessionry', 'plugins');

export const getLocalDevPluginsDir = (): string => {
  // Go up from packages/app/src/main to repo root
  return path.join(__dirname, '../../../../plugins-local');
};

export const loadUserPlugins = async (
  pluginConfigStore?: PluginConfigStore
): Promise<LoadedUserPlugin[]> => {
  const pluginsDir = getUserPluginsDir();
  if (!fs.existsSync(pluginsDir)) return [];

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  const loaded: LoadedUserPlugin[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pluginDir = path.join(pluginsDir, entry.name);
    const manifestPath = path.join(pluginDir, 'plugin.json');
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      // Check if plugin is enabled in configuration
      if (pluginConfigStore && !pluginConfigStore.isPluginEnabled(manifest.id)) {
        console.log(`[plugin-loader] ${manifest.id}: disabled in configuration, skipping`);
        continue;
      }

      const mainPath = path.resolve(pluginDir, manifest.main);
      if (!mainPath.startsWith(pluginDir + path.sep)) {
        console.error(
          `[plugin-loader] ${manifest.id}: main path escapes plugin directory, skipping`
        );
        continue;
      }
      const mod = await import(pathToFileURL(mainPath).href);
      const plugin: AppPlugin = mod.default;
      loaded.push({ manifest, pluginDir, dirName: entry.name, plugin });
    } catch (err) {
      console.error(`[plugin-loader] Failed to load plugin from ${pluginDir}:`, err);
    }
  }

  return loaded;
};

export const loadLocalDevPlugins = async (
  pluginConfigStore?: PluginConfigStore
): Promise<LoadedUserPlugin[]> => {
  const localDevDir = getLocalDevPluginsDir();
  if (!fs.existsSync(localDevDir)) return [];

  const loaded: LoadedUserPlugin[] = [];

  try {
    const repoEntries = fs.readdirSync(localDevDir, { withFileTypes: true });

    for (const repoEntry of repoEntries) {
      if (!repoEntry.isDirectory()) continue;

      const packagesDir = path.join(localDevDir, repoEntry.name, 'packages');
      if (!fs.existsSync(packagesDir)) continue;

      const pluginEntries = fs.readdirSync(packagesDir, { withFileTypes: true });

      for (const pluginEntry of pluginEntries) {
        if (!pluginEntry.isDirectory()) continue;

        const pluginDir = path.join(packagesDir, pluginEntry.name);
        const manifestPath = path.join(pluginDir, 'plugin.json');

        if (!fs.existsSync(manifestPath)) continue;

        try {
          const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

          // Check if plugin is enabled in configuration
          if (pluginConfigStore && !pluginConfigStore.isPluginEnabled(manifest.id)) {
            console.log(
              `[plugin-loader] ${manifest.id}: disabled in configuration, skipping (local-dev)`
            );
            continue;
          }

          const mainPath = path.resolve(pluginDir, manifest.main);
          if (!mainPath.startsWith(pluginDir + path.sep)) {
            console.error(
              `[plugin-loader] ${manifest.id}: main path escapes plugin directory, skipping (local-dev)`
            );
            continue;
          }

          const mod = await import(pathToFileURL(mainPath).href);
          const plugin: AppPlugin = mod.default;

          // Use repo/plugin format for dirName to ensure uniqueness
          const dirName = `${repoEntry.name}/${pluginEntry.name}`;
          loaded.push({ manifest, pluginDir, dirName, plugin });

          console.log(`[plugin-loader] Loaded local dev plugin: ${manifest.id} from ${dirName}`);
        } catch (err) {
          console.error(
            `[plugin-loader] Failed to load local dev plugin from ${pluginDir}:`,
            err
          );
        }
      }
    }
  } catch (err) {
    console.error(`[plugin-loader] Failed to scan local dev plugins directory:`, err);
  }

  return loaded;
};
