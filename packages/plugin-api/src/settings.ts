export type AppTheme = 'system' | 'dark' | 'light'

export type TerminalThemeName = 'default' | 'dracula' | 'one-dark' | 'solarized-dark' | 'github-dark'

export interface AppSettings {
  version: 1
  theme: AppTheme
  terminalTheme: TerminalThemeName
  terminalBgOverride: boolean
  terminalBgColor: string
  statusBarVisible: boolean
  confirmations: {
    confirmPaneClose: boolean
    confirmPaneGroupClose: boolean
    confirmSessionClose: boolean
  }
  plugins: Record<string, unknown>
}
