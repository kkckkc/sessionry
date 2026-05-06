/// <reference types="vite/client" />

import type { TerminalAppBridge } from '../../preload/bridge';

declare module '*.css';

declare global {
  interface Window {
    terminalApp: TerminalAppBridge;
  }
}
