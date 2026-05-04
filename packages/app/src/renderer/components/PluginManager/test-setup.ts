/**
 * Test Setup for Plugin Manager Components
 */

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron IPC
global.window = global.window || {}
global.window.terminalApp = {
  vcs: {
    getStatus: vi.fn()
  },
  plugins: {
    search: vi.fn(),
    install: vi.fn(),
    uninstall: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    checkUpdates: vi.fn(),
    onInstallProgress: vi.fn(() => () => {}),
    onUpdateProgress: vi.fn(() => () => {})
  }
} as never
