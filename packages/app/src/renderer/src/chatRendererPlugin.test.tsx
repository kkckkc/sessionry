import { beforeEach, describe, expect, it } from 'vitest';

import { createMockTerminalApp } from '../test-utils/mockTerminalApp';
import chatRendererPlugin from '@sessionry/plugin-default-view-chat/renderer';
import { normalizeChatSettings } from '../../../../../plugins/plugin-default-view-chat/src/settings';

describe('chatRendererPlugin', () => {
  beforeEach(() => {
    window.terminalApp = createMockTerminalApp();
  });

  it('normalizes legacy single-provider settings into named providers', () => {
    const settings = normalizeChatSettings({
      provider: {
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet'
      },
      systemPrompt: 'Be brief',
      persistHistory: false,
      maxHistoryMessages: 12
    });

    expect(settings.providers).toHaveLength(1);
    expect(settings.providers[0]).toMatchObject({
      name: 'Anthropic',
      type: 'anthropic',
      apiKey: 'test-key',
      model: 'claude-3-5-sonnet'
    });
    expect(settings.defaultProviderId).toBe(settings.providers[0].id);
    expect(settings.systemPrompt).toBe('Be brief');
    expect(settings.persistHistory).toBe(false);
    expect(settings.maxHistoryMessages).toBe(12);
  });

  it('returns ready provider-specific pane creation entries with the default provider first', async () => {
    window.terminalApp = createMockTerminalApp({
      settings: {
        read: async () => ({
          version: 1 as const,
          theme: 'system' as const,
          colorTheme: 'default' as const,
          terminalBgOverride: false,
          terminalBgColor: '#000000',
          statusBarVisible: true,
          confirmations: {
            confirmPaneClose: true,
            confirmPaneGroupClose: true,
            confirmSessionClose: true
          },
          keybindings: {
            custom: {},
            disabled: []
          },
          plugins: {
            'plugin-default-view-chat': {
              providers: [
                {
                  id: 'anthropic',
                  name: 'Anthropic',
                  type: 'anthropic',
                  apiKey: 'anthropic-key',
                  model: 'claude-3-5-sonnet'
                },
                {
                  id: 'openai',
                  name: 'OpenAI',
                  type: 'openai',
                  apiKey: 'openai-key',
                  model: 'gpt-4o'
                },
                {
                  id: 'broken',
                  name: 'Broken',
                  type: 'custom',
                  apiKey: '',
                  model: '',
                  baseUrl: ''
                }
              ],
              defaultProviderId: 'openai'
            }
          }
        })
      }
    });

    const entries = await chatRendererPlugin.providePaneCreations?.({
      workspace: {} as never,
      session: {} as never,
      paneGroup: {} as never
    });

    expect(entries).toEqual([
      expect.objectContaining({
        id: 'chat-openai',
        title: 'Chat with OpenAI',
        paneType: 'chat',
        defaultState: expect.objectContaining({
          providerId: 'openai',
          title: 'Chat with OpenAI'
        })
      }),
      expect.objectContaining({
        id: 'chat-anthropic',
        title: 'Chat with Anthropic',
        paneType: 'chat',
        defaultState: expect.objectContaining({
          providerId: 'anthropic',
          title: 'Chat with Anthropic'
        })
      })
    ]);
  });
});
