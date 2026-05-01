import fs from 'node:fs'

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

import type { AppSettings } from '@sessionry/plugin-api'

export type { AppSettings }

const DEFAULTS: AppSettings = {
  version: 1,
  theme: 'system',
  statusBarVisible: true,
  confirmations: {
    confirmPaneClose: true,
    confirmPaneGroupClose: true,
    confirmSessionClose: true
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
  }
}

export class SettingsStore {
  private settings: AppSettings

  constructor(private readonly filePath: string) {
    this.settings = this.load()
  }

  read(): AppSettings {
    return this.settings
  }

  update(updates: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...updates }
    this.save(this.settings)
  }

  private load(): AppSettings {
    try {
      const raw = parseYaml(fs.readFileSync(this.filePath, 'utf8')) as Record<string, unknown>
      return {
        ...DEFAULTS,
        ...raw,
        plugins: {
          ...DEFAULTS.plugins,
          ...(raw?.plugins as Record<string, unknown> | undefined)
        }
      }
    } catch {
      this.save(DEFAULTS)
      return DEFAULTS
    }
  }

  private save(settings: AppSettings): void {
    fs.writeFileSync(this.filePath, stringifyYaml(settings))
  }
}
