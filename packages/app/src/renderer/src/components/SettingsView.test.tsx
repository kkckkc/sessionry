import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppSettings, RendererViewRegistration } from '@sessionry/plugin-api';
import { createMockTerminalApp } from '../../test-utils/mockTerminalApp';

import { SettingsView } from './SettingsView';

const initialSettings: AppSettings = {
  version: 1,
  theme: 'system',
  colorTheme: 'default',
  terminalBgOverride: false,
  terminalBgColor: '#000000',
  statusBarVisible: true,
  confirmations: {
    confirmPaneClose: true,
    confirmPaneGroupClose: true,
    confirmSessionClose: true
  },
  plugins: {}
};

describe('SettingsView', () => {
  const settingsRead = vi.fn(async () => initialSettings);
  const settingsUpdate = vi.fn(async () => {});
  const settingsOnChange = vi.fn(() => () => {});

  beforeEach(() => {
    vi.clearAllMocks();
    settingsRead.mockResolvedValue(initialSettings);

    window.terminalApp = createMockTerminalApp({
      settings: {
        read: settingsRead,
        update: settingsUpdate,
        onChange: settingsOnChange
      },
      themes: {
        getAllThemes: vi.fn(async () => [])
      }
    });
  });

  it('optimistically updates confirmation toggles and persists the new settings', async () => {
    render(
      <SettingsView
        open
        onClose={() => {}}
        resolveRendererView={(_viewId: string): RendererViewRegistration | null => null}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Confirmations' }));

    const toggle = await screen.findByRole('switch', { name: 'Confirm pane close' });
    expect(toggle.closest('[data-plugin-id="app-confirmations"]')).toHaveAttribute(
      'data-plugin-surface',
      'settings'
    );
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await waitFor(() => {
      expect(settingsUpdate).toHaveBeenCalledWith({
        confirmations: {
          confirmPaneClose: false,
          confirmPaneGroupClose: true,
          confirmSessionClose: true
        }
      });
    });
  });
});
