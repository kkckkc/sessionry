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
  statusBarVisible: boolean
}
