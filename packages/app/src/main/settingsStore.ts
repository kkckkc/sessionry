import fs from 'node:fs'

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

export interface TmuxSettings {
  /** Use tmux to keep sessions alive across restarts. Default: true (when tmux is found). */
  enabled: boolean
  /** Use a dedicated tmux socket (-L sessionry) isolated from the user's own tmux sessions. Default: true. */
  dedicatedSocket: boolean
  /** Disable the tmux status bar inside Sessionry panes. Default: true. */
  disableStatusBar: boolean
  /** Inherit the user's ~/.tmux.conf. When false, tmux starts with no config (-f /dev/null). Default: false. */
  inheritConfig: boolean
  /** Kill tmux sessions (and the dedicated server, if applicable) when Sessionry exits. Default: false. */
  killOnExit: boolean
}

export interface AppSettings {
  version: 1
  tmux: TmuxSettings
}

const DEFAULTS: AppSettings = {
  version: 1,
  tmux: {
    enabled: true,
    dedicatedSocket: true,
    disableStatusBar: false,
    inheritConfig: true,
    killOnExit: true
  }
}

export class SettingsStore {
  private readonly settings: AppSettings

  constructor(private readonly filePath: string) {
    this.settings = this.load()
  }

  read(): AppSettings {
    return this.settings
  }

  private load(): AppSettings {
    try {
      const raw = parseYaml(fs.readFileSync(this.filePath, 'utf8')) as Record<string, unknown>
      return {
        ...DEFAULTS,
        ...raw,
        tmux: { ...DEFAULTS.tmux, ...(raw?.tmux as Partial<TmuxSettings> | undefined) }
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
