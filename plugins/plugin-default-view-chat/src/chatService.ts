import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { WorkspaceApi } from '@sessionry/plugin-api';
import { streamText } from 'ai';
import type { LanguageModel } from 'ai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import {
  getProviderById,
  normalizeChatSettings,
  validateProviderConfig
} from './settings';
import type { ChatPluginSettings, ChatProviderEntry, ChatProviderType } from './settings';
import type { Message, ChatSession } from './types';
import { CHAT_IPC_CHANNELS } from './constants';

type ProviderModelId = string & {};

type ProviderClient =
  | ReturnType<typeof createOpenAI>
  | ReturnType<typeof createAnthropic>
  | ReturnType<typeof createGoogleGenerativeAI>;

interface ModelInfo {
  id: string;
  name?: string;
}

interface ProviderRuntime {
  client: ProviderClient;
  model: LanguageModel;
}

interface ProviderLookupInput {
  id?: string;
  name?: string;
  type?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

const isChatProviderType = (value: unknown): value is ChatProviderType =>
  value === 'openai' || value === 'anthropic' || value === 'google' || value === 'custom';

export class ChatService {
  private sessions = new Map<string, ChatSession>();
  private settings: ChatPluginSettings;
  private historyDir: string;

  constructor(
    private emitToRenderer: (channel: string, data: unknown) => void,
    settings: ChatPluginSettings,
    workspaceRoot: string,
    private workspace: WorkspaceApi
  ) {
    this.settings = normalizeChatSettings(settings);
    this.historyDir = path.join(workspaceRoot, '.sessionry', 'chat-history');
  }

  private createProviderClient(provider: ChatProviderEntry): ProviderClient {
    if (!provider.apiKey || provider.apiKey.trim() === '') {
      throw new Error('API key is required');
    }

    switch (provider.type) {
      case 'openai':
        return createOpenAI({
          apiKey: provider.apiKey,
          baseURL: provider.baseUrl
        });
      case 'anthropic':
        return createAnthropic({
          apiKey: provider.apiKey,
          baseURL: provider.baseUrl
        });
      case 'google':
        return createGoogleGenerativeAI({
          apiKey: provider.apiKey,
          baseURL: provider.baseUrl
        });
      case 'custom':
        if (!provider.baseUrl) {
          throw new Error('Base URL is required for custom provider');
        }
        return createOpenAI({
          apiKey: provider.apiKey,
          baseURL: provider.baseUrl
        });
      default:
        throw new Error('Unsupported provider type');
    }
  }

  private createProviderRuntime(provider: ChatProviderEntry): ProviderRuntime {
    const validationError = validateProviderConfig(provider);
    if (validationError) {
      throw new Error(validationError);
    }

    const client = this.createProviderClient(provider);
    const modelId = provider.model as ProviderModelId;

    switch (provider.type) {
      case 'openai':
      case 'custom':
      case 'anthropic':
      case 'google':
        return { client, model: client(modelId) };
      default:
        throw new Error('Unsupported provider type');
    }
  }

  private resolveProviderForPane(paneId: string): ChatProviderEntry {
    const pane = this.workspace.getPane(paneId);
    const state = pane?.data.state as { providerId?: unknown } | undefined;
    const providerId = typeof state?.providerId === 'string' ? state.providerId : undefined;

    const provider = getProviderById(this.settings, providerId);
    if (!provider) {
      if (providerId) {
        throw new Error('The provider configured for this chat pane no longer exists.');
      }

      throw new Error('No default chat provider is configured.');
    }

    return provider;
  }

  private normalizeProviderLookupInput(provider: ProviderLookupInput | undefined): ChatProviderEntry {
    if (!provider || !isChatProviderType(provider.type)) {
      throw new Error('A valid provider is required to list models.');
    }

    return {
      id: typeof provider.id === 'string' ? provider.id : 'provider-preview',
      name: typeof provider.name === 'string' ? provider.name : 'Provider',
      type: provider.type,
      apiKey: typeof provider.apiKey === 'string' ? provider.apiKey : '',
      model: typeof provider.model === 'string' ? provider.model : '',
      baseUrl: typeof provider.baseUrl === 'string' ? provider.baseUrl : undefined,
      temperature: typeof provider.temperature === 'number' ? provider.temperature : undefined,
      maxTokens: typeof provider.maxTokens === 'number' ? provider.maxTokens : undefined
    };
  }

  async sendMessage(paneId: string, content: string): Promise<void> {
    let provider: ChatProviderEntry;
    let runtime: ProviderRuntime;

    try {
      provider = this.resolveProviderForPane(paneId);
      runtime = this.createProviderRuntime(provider);
    } catch (error) {
      this.emitError(
        paneId,
        error instanceof Error ? error.message : 'AI model not initialized. Please check your settings.'
      );
      return;
    }

    let session = this.sessions.get(paneId);
    if (!session) {
      session = {
        paneId,
        messages: [],
        isStreaming: false
      };
      this.sessions.set(paneId, session);

      if (this.settings.persistHistory) {
        await this.loadHistoryFromDisk(paneId);
        session = this.sessions.get(paneId)!;
      }
    }

    const userMessage: Message = {
      id: this.generateMessageId(),
      role: 'user',
      content,
      timestamp: Date.now()
    };
    session.messages.push(userMessage);

    const assistantMessageId = this.generateMessageId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };
    session.messages.push(assistantMessage);
    session.isStreaming = true;
    session.currentStreamingMessageId = assistantMessageId;

    try {
      const conversationMessages = session.messages
        .filter(message => message.role !== 'system' && message.id !== assistantMessageId)
        .map(message => ({
          role: message.role,
          content: message.content
        }));

      const messages = this.settings.systemPrompt
        ? [{ role: 'system' as const, content: this.settings.systemPrompt }, ...conversationMessages]
        : conversationMessages;

      const result = await streamText({
        model: runtime.model,
        messages,
        temperature: provider.temperature,
        maxTokens: provider.maxTokens
      });

      let fullContent = '';

      for await (const chunk of result.textStream) {
        fullContent += chunk;
        assistantMessage.content = fullContent;

        this.emitToRenderer(CHAT_IPC_CHANNELS.streamChunk, {
          paneId,
          messageId: assistantMessageId,
          chunk
        });
      }

      session.isStreaming = false;
      session.currentStreamingMessageId = undefined;

      this.emitToRenderer(CHAT_IPC_CHANNELS.streamComplete, {
        paneId,
        messageId: assistantMessageId
      });

      if (this.settings.persistHistory) {
        await this.saveHistoryToDisk(paneId);
      }
    } catch (error) {
      console.error('[ChatService] Error streaming message:', error);
      session.isStreaming = false;
      session.currentStreamingMessageId = undefined;
      assistantMessage.error = true;
      assistantMessage.content = 'Failed to generate response. Please try again.';

      this.emitToRenderer(CHAT_IPC_CHANNELS.streamError, {
        paneId,
        messageId: assistantMessageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async loadHistory(paneId: string): Promise<Message[]> {
    const session = this.sessions.get(paneId);
    if (session) {
      return session.messages;
    }

    if (this.settings.persistHistory) {
      await this.loadHistoryFromDisk(paneId);
      const loadedSession = this.sessions.get(paneId);
      return loadedSession?.messages ?? [];
    }

    return [];
  }

  async clearHistory(paneId: string): Promise<void> {
    const session = this.sessions.get(paneId);
    if (session) {
      session.messages = [];
    }

    if (this.settings.persistHistory) {
      try {
        const historyFile = path.join(this.historyDir, `${paneId}.json`);
        await fs.unlink(historyFile);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error('[ChatService] Error deleting history file:', error);
        }
      }
    }
  }

  updateSettings(settings: ChatPluginSettings): void {
    this.settings = normalizeChatSettings(settings);
  }

  removeSession(paneId: string): void {
    this.sessions.delete(paneId);
  }

  async listModels(providerInput?: ProviderLookupInput): Promise<ModelInfo[]> {
    const provider = this.normalizeProviderLookupInput(providerInput);
    const client = this.createProviderClient(provider);

    try {
      if ('listModels' in client && typeof client.listModels === 'function') {
        const models = await client.listModels();
        return models.map((model: { id: string; name?: string }) => ({
          id: model.id,
          name: model.name
        }));
      }

      if (provider.type === 'openai' || provider.type === 'custom') {
        const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
        const response = await fetch(`${baseUrl}/models`, {
          headers: {
            Authorization: `Bearer ${provider.apiKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.statusText}`);
        }

        const data = (await response.json()) as { data: Array<{ id: string }> };
        return data.data.map(model => ({ id: model.id }));
      }

      throw new Error('Model listing not supported for this provider');
    } catch (error) {
      console.error('[ChatService] Error listing models:', error);
      throw error;
    }
  }

  private async loadHistoryFromDisk(paneId: string): Promise<void> {
    try {
      const historyFile = path.join(this.historyDir, `${paneId}.json`);
      const data = await fs.readFile(historyFile, 'utf-8');
      const messages = JSON.parse(data) as Message[];
      const limitedMessages = messages.slice(-this.settings.maxHistoryMessages);

      const session = this.sessions.get(paneId);
      if (session) {
        session.messages = limitedMessages;
      } else {
        this.sessions.set(paneId, {
          paneId,
          messages: limitedMessages,
          isStreaming: false
        });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[ChatService] Error loading history:', error);
      }
    }
  }

  private async saveHistoryToDisk(paneId: string): Promise<void> {
    const session = this.sessions.get(paneId);
    if (!session) return;

    try {
      await fs.mkdir(this.historyDir, { recursive: true });

      const messagesToSave = session.messages.slice(-this.settings.maxHistoryMessages);
      const historyFile = path.join(this.historyDir, `${paneId}.json`);
      await fs.writeFile(historyFile, JSON.stringify(messagesToSave, null, 2), 'utf-8');
    } catch (error) {
      console.error('[ChatService] Error saving history:', error);
    }
  }

  private emitError(paneId: string, error: string): void {
    const messageId = this.generateMessageId();
    this.emitToRenderer(CHAT_IPC_CHANNELS.streamError, {
      paneId,
      messageId,
      error
    });
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}
