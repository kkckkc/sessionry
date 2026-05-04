import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppSettings, RendererViewRegistration } from '@sessionry/plugin-api'

import { SettingsView } from './SettingsView'

const initialSettings: AppSettings = {
  version: 1,
  theme: 'system',
  terminalTheme: 'default',
  terminalBgOverride: false,
  terminalBgColor: '#000000',
  statusBarVisible: true,
  confirmations: {
    confirmPaneClose: true,
    confirmPaneGroupClose: true,
    confirmSessionClose: true
  },
  plugins: {}
}

describe('SettingsView', () => {
  const settings = {
    read: vi.fn(async () => initialSettings),
    update: vi.fn(async () => {}),
    onChange: vi.fn(() => () => {})
  }

  beforeEach(() => {
    vi.clearAllMocks()
    settings.read.mockResolvedValue(initialSettings)

    window.terminalApp = {
      showFolderDialog: vi.fn(),
      getPathForDroppedFile: vi.fn(),
      formatPathForTerminal: vi.fn((targetPath: string) => targetPath),
      createTerminalSession: vi.fn(),
      sendTerminalInput: vi.fn(),
      resizeTerminal: vi.fn(),
      getPluginModel: vi.fn(),
      getUserPluginRenderers: vi.fn(),
      actions: {
        list: vi.fn(),
        execute: vi.fn()
      },
      workspace: {
        read: vi.fn(),
        executeCommand: vi.fn(),
        onEvent: vi.fn()
      },
      settings,
      onTerminalData: vi.fn(),
      onTerminalState: vi.fn(),
      onTerminalExit: vi.fn()
    } as never
  })

  it('optimistically updates confirmation toggles and persists the new settings', async () => {
    render(
      <SettingsView
        open
        onClose={() => {}}
        resolveRendererView={(_viewId: string): RendererViewRegistration | null => null}
      />
    )

    const toggle = await screen.findByRole('switch', { name: 'Confirm pane close' })
    expect(toggle.closest('[data-plugin-id="app-confirmations"]')).toHaveAttribute('data-plugin-surface', 'settings')
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await waitFor(() => {
      expect(settings.update).toHaveBeenCalledWith({
        confirmations: {
          confirmPaneClose: false,
          confirmPaneGroupClose: true,
          confirmSessionClose: true
        }
      })
    })
  })
})
