import type { TerminalAppBridge } from './rendererBridge';

declare global {
  interface Window {
    terminalApp: TerminalAppBridge;
  }
}
