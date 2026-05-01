export type AppTheme = 'system' | 'dark' | 'light'

export interface AppSettings {
  version: 1
  theme: AppTheme
  statusBarVisible: boolean
  confirmations: {
    confirmPaneClose: boolean
    confirmPaneGroupClose: boolean
    confirmSessionClose: boolean
  }
  plugins: Record<string, unknown>
}
