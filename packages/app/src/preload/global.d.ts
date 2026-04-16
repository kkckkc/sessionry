import type { TerminalAppBridge } from '@sessionry/plugin-api'

declare global {
  interface Window {
    terminalApp: TerminalAppBridge
  }
}

export {}
