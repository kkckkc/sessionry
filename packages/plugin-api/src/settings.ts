export interface AppSettings {
  version: 1
  statusBarVisible: boolean
  confirmations: {
    confirmPaneClose: boolean
    confirmPaneGroupClose: boolean
    confirmSessionClose: boolean
  }
  plugins: Record<string, unknown>
}
