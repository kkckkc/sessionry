import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { LanguageModel } from 'ai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type { ChatPluginSettings } from './settings';
import type { Message, ChatSession } from './types';
import { CHAT_IPC_CHANNELS } from './constants';

type ProviderModelId = string & {};

interface ModelInfo {
  id: string;
  name?: string;
}

export class ChatService {
  private sessions = new Map<string, ChatSession>();
  private aiModel: LanguageModel | null = null;
  private currentProvider: ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic> | ReturnType<typeof createGoogleGenerativeAI> | null = null;
  private settings: ChatPluginSettings;
  private historyDir: string;

  constructor(
    private emitToRenderer: (channel: string, data: unknown) => void,
    settings: ChatPluginSettings,
    workspaceRoot: string
  ) {
    this.settings = settings;
    this.historyDir = path.join(workspaceRoot, '.sessionry', 'chat-history');
    this.initializeAIModel();
  }

  private initializeAIModel(): void {
    const { provider } = this.settings.provider;
    const { apiKey, model, baseUrl } = this.settings.provider;
    const modelId = model as ProviderModelId;

    try {
      switch (provider) {
        case 'openai': {
          const openai = createOpenAI({
            apiKey,
            baseURL: baseUrl
          });
          this.currentProvider = openai;
          this.aiModel = openai(modelId);
          break;
        }
        case 'anthropic': {
          const anthropic = createAnthropic({
            apiKey,
            baseURL: baseUrl
          });
          this.currentProvider = anthropic;
          this.aiModel = anthropic(modelId);
          break;
        }
        case 'google': {
          const google = createGoogleGenerativeAI({
            apiKey,
            baseURL: baseUrl
          });
          this.currentProvider = google;
          this.aiModel = google(modelId);
          break;
        }
        case 'custom': {
          if (!baseUrl) {
            throw new Error('Base URL is required for custom provider');
          }
          const customProvider = createOpenAI({
            apiKey,
            baseURL: baseUrl
          });
          this.currentProvider = customProvider;
          this.aiModel = customProvider(modelId);
          break;
        }
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error('[ChatService] Failed to initialize AI model:', error);
      this.aiModel = null;
      this.currentProvider = null;
    }
  }

  async sendMessage(paneId: string, content: string): Promise<void> {
    if (!this.aiModel) {
      this.emitError(paneId, 'AI model not initialized. Please check your settings.');
      return;
    }

    // Get or create session
    let session = this.sessions.get(paneId);
    if (!session) {
      session = {
        paneId,
        messages: [],
        isStreaming: false
      };
      this.sessions.set(paneId, session);

      // Try to load history
      if (this.settings.persistHistory) {
        await this.loadHistoryFromDisk(paneId);
        session = this.sessions.get(paneId)!;
      }
    }

    // Add user message
    const userMessage: Message = {
      id: this.generateMessageId(),
      role: 'user',
      content,
      timestamp: Date.now()
    };
    session.messages.push(userMessage);

    // Create assistant message placeholder
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
      // Build conversation history for AI
      const conversationMessages = session.messages
        .filter(m => m.role !== 'system' && m.id !== assistantMessageId)
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      // Add system prompt if configured
      const messages = this.settings.systemPrompt
        ? [{ role: 'system' as const, content: this.settings.systemPrompt }, ...conversationMessages]
        : conversationMessages;

      // Stream the response
      const result = await streamText({
        model: this.aiModel,
        messages,
        temperature: this.settings.provider.temperature,
        maxTokens: this.settings.provider.maxTokens
      });

      let fullContent = '';

      for await (const chunk of result.textStream) {
        fullContent += chunk;
        assistantMessage.content = fullContent;

        // Emit chunk to renderer
        this.emitToRenderer(CHAT_IPC_CHANNELS.streamChunk, {
          paneId,
          messageId: assistantMessageId,
          chunk
        });
      }

      // Mark streaming complete
      session.isStreaming = false;
      session.currentStreamingMessageId = undefined;

      this.emitToRenderer(CHAT_IPC_CHANNELS.streamComplete, {
        paneId,
        messageId: assistantMessageId
      });

      // Save history if enabled
      if (this.settings.persistHistory) {
        await this.saveHistoryToDisk(paneId);
      }
    } catch (error) {
      console.error('[ChatService] Error streaming message:', error);
      session.isStreaming = false;
      session.currentStreamingMessageId = undefined;

      // Mark message as error
      assistantMessage.error = true;
      assistantMessage.content = 'Failed to generate response. Please try again.';

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emitToRenderer(CHAT_IPC_CHANNELS.streamError, {
        paneId,
        messageId: assistantMessageId,
        error: errorMessage
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

    // Delete history file if it exists
    if (this.settings.persistHistory) {
      try {
        const historyFile = path.join(this.historyDir, `${paneId}.json`);
        await fs.unlink(historyFile);
      } catch (error) {
        // Ignore if file doesn't exist
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error('[ChatService] Error deleting history file:', error);
        }
      }
    }
  }

  updateSettings(settings: ChatPluginSettings): void {
    this.settings = settings;
    this.initializeAIModel();
  }

  removeSession(paneId: string): void {
    this.sessions.delete(paneId);
  }

  async listModels(): Promise<ModelInfo[]> {
    if (!this.currentProvider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Try using the listModels API if available (newer versions)
      if ('listModels' in this.currentProvider && typeof this.currentProvider.listModels === 'function') {
        const models = await this.currentProvider.listModels();
        return models.map((m: { id: string; name?: string }) => ({
          id: m.id,
          name: m.name
        }));
      }

      // Fallback: fetch from /v1/models endpoint for OpenAI-compatible providers
      const { provider } = this.settings.provider;
      if (provider === 'openai' || provider === 'custom') {
        const baseUrl = this.settings.provider.baseUrl || 'https://api.openai.com/v1';
        const response = await fetch(`${baseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${this.settings.provider.apiKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.statusText}`);
        }

        const data = await response.json() as { data: Array<{ id: string }> };
        return data.data.map(m => ({ id: m.id }));
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

      // Apply max message limit
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
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[ChatService] Error loading history:', error);
      }
    }
  }

  private async saveHistoryToDisk(paneId: string): Promise<void> {
    const session = this.sessions.get(paneId);
    if (!session) return;

    try {
      // Ensure directory exists
      await fs.mkdir(this.historyDir, { recursive: true });

      // Apply max message limit before saving
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
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
