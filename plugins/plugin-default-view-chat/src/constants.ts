export const CHAT_IPC_CHANNELS = {
  sendMessage: 'chat:send-message',
  streamChunk: 'chat:stream-chunk',
  streamComplete: 'chat:stream-complete',
  streamError: 'chat:stream-error',
  clearHistory: 'chat:clear-history',
  loadHistory: 'chat:load-history',
  listModels: 'chat:list-models'
} as const;

export const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant integrated into Sessionry, a developer-focused terminal and workspace application.';

export const PROVIDER_MODELS = {
  openai: [
    { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
  ],
  google: [
    { value: 'gemini-pro', label: 'Gemini Pro' },
    { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
  ],
  custom: []
} as const;

export const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'custom', label: 'Custom (OpenAI-compatible)' }
] as const;
