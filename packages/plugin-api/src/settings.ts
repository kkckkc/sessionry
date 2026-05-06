export type AppTheme = 'system' | 'dark' | 'light';

/**
 * Theme ID is now a string since themes are provided by plugins dynamically.
 * @deprecated Use string directly. This type alias is kept for backwards compatibility.
 */
export type TerminalThemeName = string;

/**
 * Theme ID - references a theme registered by any plugin
 */
export type ThemeId = string;

export type PluginSource = 'local' | 'npm' | 'builtin';

export interface InstalledPlugin {
  id: string;
  source: PluginSource;
  version: string;
  enabled: boolean;

  // For npm plugins
  package?: string;
  installedAt?: string;
  updateAvailable?: string;

  // For local plugins
  path?: string;
}

export interface PluginRegistryConfig {
  url: string;
  scope?: string;
}

export interface PluginManagementConfig {
  registry: PluginRegistryConfig;
  installed: InstalledPlugin[];
}

export interface AppSettings {
  version: 1;
  theme: AppTheme;
  colorTheme: ThemeId;
  terminalBgOverride: boolean;
  terminalBgColor: string;
  statusBarVisible: boolean;
  confirmations: {
    confirmPaneClose: boolean;
    confirmPaneGroupClose: boolean;
    confirmSessionClose: boolean;
  };
  plugins: Record<string, unknown>;
  pluginManagement?: PluginManagementConfig;
}
