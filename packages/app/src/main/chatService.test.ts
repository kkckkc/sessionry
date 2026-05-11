import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatService } from '../../../../plugins/plugin-default-view-chat/src/chatService';

describe('ChatService', () => {
  const emitToRenderer = vi.fn();

  beforeEach(() => {
    emitToRenderer.mockReset();
  });

  it('resolves the provider from pane state for each chat pane', () => {
    const service = new ChatService(
      emitToRenderer,
      {
        providers: [
          {
            id: 'openai-provider',
            name: 'OpenAI',
            type: 'openai',
            apiKey: 'openai-key',
            model: 'gpt-4o'
          },
          {
            id: 'anthropic-provider',
            name: 'Anthropic',
            type: 'anthropic',
            apiKey: 'anthropic-key',
            model: 'claude-3-5-sonnet'
          }
        ],
        defaultProviderId: 'openai-provider',
        systemPrompt: 'System prompt',
        persistHistory: false,
        maxHistoryMessages: 20
      },
      '/tmp',
      {
        getPane: (paneId: string) => ({
          data: {
            state: {
              providerId: paneId === 'pane-openai' ? 'openai-provider' : 'anthropic-provider'
            }
          }
        })
      } as never
    );

    expect((service as any).resolveProviderForPane('pane-openai')).toMatchObject({
      id: 'openai-provider',
      type: 'openai'
    });
    expect((service as any).resolveProviderForPane('pane-anthropic')).toMatchObject({
      id: 'anthropic-provider',
      type: 'anthropic'
    });
  });

  it('falls back to the default provider for panes without a provider id', () => {
    const service = new ChatService(
      emitToRenderer,
      {
        providers: [
          {
            id: 'openai-provider',
            name: 'OpenAI',
            type: 'openai',
            apiKey: 'openai-key',
            model: 'gpt-4o'
          }
        ],
        defaultProviderId: 'openai-provider',
        systemPrompt: '',
        persistHistory: false,
        maxHistoryMessages: 20
      },
      '/tmp',
      {
        getPane: () => ({
          data: {
            state: {}
          }
        })
      } as never
    );

    expect((service as any).resolveProviderForPane('pane-legacy')).toMatchObject({
      id: 'openai-provider',
      type: 'openai'
    });
  });

  it('emits a clear error when a pane references a deleted provider', async () => {
    const service = new ChatService(
      emitToRenderer,
      {
        providers: [
          {
            id: 'openai-provider',
            name: 'OpenAI',
            type: 'openai',
            apiKey: 'openai-key',
            model: 'gpt-4o'
          }
        ],
        defaultProviderId: 'openai-provider',
        systemPrompt: '',
        persistHistory: false,
        maxHistoryMessages: 20
      },
      '/tmp',
      {
        getPane: () => ({
          data: {
            state: {
              providerId: 'missing-provider'
            }
          }
        })
      } as never
    );

    await service.sendMessage('pane-missing', 'Hello');

    expect(emitToRenderer).toHaveBeenCalledWith(
      'chat:stream-error',
      expect.objectContaining({
        paneId: 'pane-missing',
        error: 'The provider configured for this chat pane no longer exists.'
      })
    );
  });
});
