import { describe, expect, it, vi } from 'vitest';

import terminalPresetsRendererPlugin from '../src/renderer';

describe('terminal presets renderer plugin', () => {
  it('creates terminal pane entries from plugin settings', async () => {
    window.terminalApp = {
      settings: {
        read: vi.fn(async () => ({
          plugins: {
            'plugin-default-terminal-presets': {
              presets: [{ id: 'dev', name: 'Dev server', command: 'pnpm dev' }]
            }
          }
        }))
      }
    } as unknown as typeof window.terminalApp;

    const entries = await terminalPresetsRendererPlugin.providePaneCreations?.({
      workspace: {} as never,
      session: {} as never,
      paneGroup: {} as never
    });

    expect(entries).toEqual([
      expect.objectContaining({
        title: 'Dev server',
        paneType: 'terminal',
        defaultState: expect.objectContaining({
          name: 'Dev server',
          initialCommand: 'pnpm dev',
          initialCommandPending: true
        })
      })
    ]);
  });
});
