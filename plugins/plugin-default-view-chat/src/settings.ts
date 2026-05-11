import { DEFAULT_SYSTEM_PROMPT } from './constants';

export type ChatProvider = 'openai' | 'anthropic' | 'google' | 'custom';

export interface ChatProviderConfig {
  provider: ChatProvider;
  apiKey: string;
  model: string;
  baseUrl?: string; // For custom providers
  temperature?: number;
  maxTokens?: number;
}

export interface ChatPluginSettings {
  provider: ChatProviderConfig;
  systemPrompt: string;
  persistHistory: boolean;
  maxHistoryMessages: number;
}

export const DEFAULT_CHAT_SETTINGS: ChatPluginSettings = {
  provider: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 2000
  },
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  persistHistory: true,
  maxHistoryMessages: 50
};

export function validateProviderConfig(config: ChatProviderConfig): string | null {
  if (!config.apiKey || config.apiKey.trim() === '') {
    return 'API key is required';
  }

  if (!config.model || config.model.trim() === '') {
    return 'Model is required';
  }

  if (config.provider === 'custom' && (!config.baseUrl || config.baseUrl.trim() === '')) {
    return 'Base URL is required for custom providers';
  }

  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
    return 'Temperature must be between 0 and 2';
  }

  if (config.maxTokens !== undefined && config.maxTokens < 1) {
    return 'Max tokens must be greater than 0';
  }

  return null;
}
