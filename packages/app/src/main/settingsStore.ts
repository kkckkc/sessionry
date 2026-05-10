import fs from 'node:fs';

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import type { AppSettings } from '@sessionry/plugin-api';

export type { AppSettings };

const DEFAULTS: AppSettings = {
  version: 1,
  theme: 'system',
  colorTheme: 'default',
  terminalBgOverride: false,
  terminalBgColor: '#000000',
  statusBarVisible: true,
  confirmations: {
    confirmPaneClose: true,
    confirmPaneGroupClose: true,
    confirmSessionClose: true
  },
  keybindings: {
    custom: {},
    disabled: []
  },
  plugins: {
    'plugin-default-view-terminal': {
      tmux: {
        enabled: false,
        dedicatedSocket: true,
        disableStatusBar: false,
        inheritConfig: true,
        killOnExit: true
      }
    }
  },
  pluginManagement: {
    registry: {
      url: 'https://registry.npmjs.org',
      scope: '@sessionry'
    },
    installed: []
  }
};

export class SettingsStore {
  private settings: AppSettings;

  constructor(private readonly filePath: string) {
    this.settings = this.load();
  }

  read(): AppSettings {
    return this.settings;
  }

  update(updates: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.save(this.settings);
  }

  private load(): AppSettings {
    try {
      const raw = parseYaml(fs.readFileSync(this.filePath, 'utf8')) as Record<string, unknown>;

      // Migration: convert old terminalTheme to colorTheme
      if ('terminalTheme' in raw && !('colorTheme' in raw)) {
        raw.colorTheme = raw.terminalTheme;
        delete raw.terminalTheme;
        console.log('[SettingsStore] Migrated terminalTheme to colorTheme');
      }

      return {
        ...DEFAULTS,
        ...raw,
        plugins: {
          ...DEFAULTS.plugins,
          ...(raw?.plugins as Record<string, unknown> | undefined)
        },
        pluginManagement: {
          ...DEFAULTS.pluginManagement!,
          ...(raw?.pluginManagement as Record<string, unknown> | undefined)
        }
      };
    } catch {
      this.save(DEFAULTS);
      return DEFAULTS;
    }
  }

  private save(settings: AppSettings): void {
    fs.writeFileSync(this.filePath, stringifyYaml(settings));
  }
}
