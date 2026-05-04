export type AppTheme = 'system' | 'dark' | 'light'

/**
 * Theme ID is now a string since themes are provided by plugins dynamically.
 * @deprecated Use string directly. This type alias is kept for backwards compatibility.
 */
export type TerminalThemeName = string

/**
 * Theme ID - references a theme registered by any plugin
 */
export type ThemeId = string

export interface AppSettings {
  version: 1
  theme: AppTheme
  colorTheme: ThemeId
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
