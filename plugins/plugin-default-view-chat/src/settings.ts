import { DEFAULT_SYSTEM_PROMPT, PROVIDER_MODELS, PROVIDER_OPTIONS } from './constants';

export type ChatProviderType = 'openai' | 'anthropic' | 'google' | 'custom';

export interface ChatProviderEntry {
  id: string;
  name: string;
  type: ChatProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

interface LegacyChatProviderConfig {
  provider: ChatProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

interface LegacyChatPluginSettings {
  provider?: LegacyChatProviderConfig;
  systemPrompt?: string;
  persistHistory?: boolean;
  maxHistoryMessages?: number;
}

export interface ChatPluginSettings {
  providers: ChatProviderEntry[];
  defaultProviderId?: string;
  systemPrompt: string;
  persistHistory: boolean;
  maxHistoryMessages: number;
}

const DEFAULT_PROVIDER_TYPE: ChatProviderType = 'openai';

const createProviderId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `chat-provider-${crypto.randomUUID()}`;
  }

  return `chat-provider-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

export const getDefaultModelForProviderType = (type: ChatProviderType): string =>
  type === 'custom' ? '' : PROVIDER_MODELS[type][0]?.value ?? '';

export const getProviderTypeLabel = (type: ChatProviderType): string =>
  PROVIDER_OPTIONS.find(option => option.value === type)?.label.replace(' (OpenAI-compatible)', '') ??
  type;

export const createChatProviderEntry = (
  type: ChatProviderType = DEFAULT_PROVIDER_TYPE,
  overrides: Partial<ChatProviderEntry> = {}
): ChatProviderEntry => ({
  id: overrides.id ?? createProviderId(),
  name: overrides.name ?? getProviderTypeLabel(type),
  type,
  apiKey: overrides.apiKey ?? '',
  model: overrides.model ?? getDefaultModelForProviderType(type),
  ...(overrides.baseUrl !== undefined ? { baseUrl: overrides.baseUrl } : {}),
  temperature: overrides.temperature ?? 0.7,
  maxTokens: overrides.maxTokens ?? 2000
});

export const DEFAULT_CHAT_SETTINGS: ChatPluginSettings = {
  providers: [createChatProviderEntry()],
  defaultProviderId: undefined,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  persistHistory: true,
  maxHistoryMessages: 50
};

const normalizeProviderType = (value: unknown): ChatProviderType =>
  value === 'openai' || value === 'anthropic' || value === 'google' || value === 'custom'
    ? value
    : DEFAULT_PROVIDER_TYPE;

const normalizeProviderEntry = (value: unknown, index: number): ChatProviderEntry | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const type = normalizeProviderType(record.type);

  return createChatProviderEntry(type, {
    id: typeof record.id === 'string' && record.id.length > 0 ? record.id : `provider-${index + 1}`,
    name:
      typeof record.name === 'string' && record.name.trim().length > 0
        ? record.name.trim()
        : getProviderTypeLabel(type),
    apiKey: typeof record.apiKey === 'string' ? record.apiKey : '',
    model:
      typeof record.model === 'string' ? record.model : getDefaultModelForProviderType(type),
    baseUrl: typeof record.baseUrl === 'string' ? record.baseUrl : undefined,
    temperature: typeof record.temperature === 'number' ? record.temperature : undefined,
    maxTokens: typeof record.maxTokens === 'number' ? record.maxTokens : undefined
  });
};

const normalizeLegacyProvider = (value: LegacyChatProviderConfig): ChatProviderEntry => {
  const type = normalizeProviderType(value.provider);
  return createChatProviderEntry(type, {
    name: getProviderTypeLabel(type),
    apiKey: typeof value.apiKey === 'string' ? value.apiKey : '',
    model:
      typeof value.model === 'string' && value.model.length > 0
        ? value.model
        : getDefaultModelForProviderType(type),
    baseUrl: typeof value.baseUrl === 'string' ? value.baseUrl : undefined,
    temperature: typeof value.temperature === 'number' ? value.temperature : undefined,
    maxTokens: typeof value.maxTokens === 'number' ? value.maxTokens : undefined
  });
};

export const normalizeChatSettings = (value: unknown): ChatPluginSettings => {
  const defaults = DEFAULT_CHAT_SETTINGS;

  if (!value || typeof value !== 'object') {
    const fallbackProvider = defaults.providers[0];
    return {
      ...defaults,
      providers: [fallbackProvider],
      defaultProviderId: fallbackProvider.id
    };
  }

  const settings = value as Record<string, unknown>;
  const maybeLegacy = settings as LegacyChatPluginSettings;

  const providers =
    Array.isArray(settings.providers) && settings.providers.length > 0
      ? settings.providers
          .map((provider, index) => normalizeProviderEntry(provider, index))
          .filter((provider): provider is ChatProviderEntry => provider !== null)
      : maybeLegacy.provider
        ? [normalizeLegacyProvider(maybeLegacy.provider)]
        : defaults.providers.map(provider => ({ ...provider }));

  const defaultProviderIdCandidate =
    typeof settings.defaultProviderId === 'string' ? settings.defaultProviderId : undefined;
  const defaultProviderId =
    providers.find(provider => provider.id === defaultProviderIdCandidate)?.id ?? providers[0]?.id;

  return {
    providers,
    defaultProviderId,
    systemPrompt:
      typeof settings.systemPrompt === 'string' ? settings.systemPrompt : defaults.systemPrompt,
    persistHistory:
      typeof settings.persistHistory === 'boolean'
        ? settings.persistHistory
        : defaults.persistHistory,
    maxHistoryMessages:
      typeof settings.maxHistoryMessages === 'number'
        ? settings.maxHistoryMessages
        : defaults.maxHistoryMessages
  };
};

export function validateProviderConfig(config: ChatProviderEntry): string | null {
  if (!config.name || config.name.trim() === '') {
    return 'Provider name is required';
  }

  if (!config.apiKey || config.apiKey.trim() === '') {
    return 'API key is required';
  }

  if (!config.model || config.model.trim() === '') {
    return 'Model is required';
  }

  if (config.type === 'custom' && (!config.baseUrl || config.baseUrl.trim() === '')) {
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

export const isProviderReady = (config: ChatProviderEntry): boolean =>
  validateProviderConfig(config) === null;

export const getProviderById = (
  settings: ChatPluginSettings,
  providerId?: string
): ChatProviderEntry | undefined => {
  if (!providerId) {
    return settings.providers.find(provider => provider.id === settings.defaultProviderId);
  }

  return settings.providers.find(provider => provider.id === providerId);
};
