import type { InstalledPlugin, PluginManagementConfig } from '@sessionry/plugin-api';

export class PluginConfigStore {
  constructor(private config: PluginManagementConfig) {}

  getConfig(): PluginManagementConfig {
    return this.config;
  }

  updateConfig(updates: Partial<PluginManagementConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getInstalledPlugins(): InstalledPlugin[] {
    return this.config.installed;
  }

  getPlugin(pluginId: string): InstalledPlugin | undefined {
    return this.config.installed.find(p => p.id === pluginId);
  }

  isPluginEnabled(pluginId: string): boolean {
    const plugin = this.getPlugin(pluginId);
    return plugin?.enabled ?? false;
  }

  addPlugin(plugin: InstalledPlugin): void {
    const existing = this.getPlugin(plugin.id);
    if (existing) {
      throw new Error(`Plugin ${plugin.id} is already installed`);
    }
    this.config.installed.push(plugin);
  }

  updatePlugin(pluginId: string, updates: Partial<InstalledPlugin>): void {
    const index = this.config.installed.findIndex(p => p.id === pluginId);
    if (index === -1) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    this.config.installed[index] = { ...this.config.installed[index], ...updates };
  }

  removePlugin(pluginId: string): void {
    const index = this.config.installed.findIndex(p => p.id === pluginId);
    if (index === -1) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    this.config.installed.splice(index, 1);
  }

  enablePlugin(pluginId: string): void {
    this.updatePlugin(pluginId, { enabled: true });
  }

  disablePlugin(pluginId: string): void {
    this.updatePlugin(pluginId, { enabled: false });
  }

  getEnabledPlugins(): InstalledPlugin[] {
    return this.config.installed.filter(p => p.enabled);
  }

  getDisabledPlugins(): InstalledPlugin[] {
    return this.config.installed.filter(p => !p.enabled);
  }

  isIpcApproved(pluginId: string): boolean {
    const plugin = this.getPlugin(pluginId);
    return plugin?.ipcApproved ?? false;
  }

  setIpcApproval(pluginId: string, approved: boolean): void {
    this.updatePlugin(pluginId, { ipcApproved: approved });
  }
}
