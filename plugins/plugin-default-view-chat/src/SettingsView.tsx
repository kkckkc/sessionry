import { useEffect, useMemo, useState } from 'react';
import type { SettingsViewProps } from '@sessionry/plugin-api';
import {
  SettingsSection,
  SettingsField,
  SettingToggle,
  SettingSelect,
  Combobox,
  Input,
  Button,
  Textarea
} from '@sessionry/components';
import type { SelectOption } from '@sessionry/components';

import type { ListModelsPayload } from './types';
import {
  DEFAULT_CHAT_SETTINGS,
  createChatProviderEntry,
  getDefaultModelForProviderType,
  normalizeChatSettings,
  validateProviderConfig
} from './settings';
import type { ChatPluginSettings, ChatProviderEntry, ChatProviderType } from './settings';
import { PROVIDER_OPTIONS, PROVIDER_MODELS, CHAT_IPC_CHANNELS } from './constants';

interface ListModelsResponse {
  models?: Array<{ id: string; name?: string }>;
  error?: string;
}

export const ChatSettingsView = ({ settings, onUpdate }: SettingsViewProps) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<SelectOption[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchModelsError, setFetchModelsError] = useState<string | null>(null);

  const chatSettings = useMemo(
    () => normalizeChatSettings(settings ?? DEFAULT_CHAT_SETTINGS),
    [settings]
  );

  useEffect(() => {
    if (
      !selectedProviderId ||
      !chatSettings.providers.some(provider => provider.id === selectedProviderId)
    ) {
      setSelectedProviderId(chatSettings.defaultProviderId ?? chatSettings.providers[0]?.id ?? null);
    }
  }, [chatSettings.defaultProviderId, chatSettings.providers, selectedProviderId]);

  const selectedProvider =
    chatSettings.providers.find(provider => provider.id === selectedProviderId) ??
    chatSettings.providers[0];

  const validationError = selectedProvider ? validateProviderConfig(selectedProvider) : null;

  const modelOptions: SelectOption[] =
    selectedProvider && selectedProvider.type !== 'custom'
      ? PROVIDER_MODELS[selectedProvider.type].map(model => ({
          value: model.value,
          label: model.label
        }))
      : [];

  const persistSettings = (nextSettings: ChatPluginSettings) => {
    void onUpdate(nextSettings);
  };

  const updateProviders = (
    updater: (providers: ChatProviderEntry[]) => {
      providers: ChatProviderEntry[];
      defaultProviderId?: string;
      selectedProviderId?: string | null;
    }
  ) => {
    const result = updater(chatSettings.providers);
    const nextSettings: ChatPluginSettings = {
      ...chatSettings,
      providers: result.providers,
      defaultProviderId: result.defaultProviderId ?? chatSettings.defaultProviderId
    };

    if (
      !nextSettings.defaultProviderId ||
      !nextSettings.providers.some(provider => provider.id === nextSettings.defaultProviderId)
    ) {
      nextSettings.defaultProviderId = nextSettings.providers[0]?.id;
    }

    setSelectedProviderId(
      result.selectedProviderId === undefined
        ? selectedProviderId
        : result.selectedProviderId ?? nextSettings.providers[0]?.id ?? null
    );
    setFetchedModels([]);
    setFetchModelsError(null);
    persistSettings(nextSettings);
  };

  const updateProvider = (providerId: string, updates: Partial<ChatProviderEntry>) => {
    updateProviders(providers => ({
      providers: providers.map(provider => (provider.id === providerId ? { ...provider, ...updates } : provider))
    }));
  };

  const handleProviderTypeChange = (providerId: string, typeValue: string) => {
    const type = typeValue as ChatProviderType;
    updateProviders(providers => ({
      providers: providers.map(provider =>
        provider.id === providerId
          ? {
              ...provider,
              type,
              model: getDefaultModelForProviderType(type),
              ...(type === 'custom' ? {} : { baseUrl: provider.baseUrl ?? '' })
            }
          : provider
      )
    }));
  };

  const handleAddProvider = () => {
    const defaultType = PROVIDER_OPTIONS[0]?.value as ChatProviderType;
    const provider = createChatProviderEntry(defaultType, {
      name: `${PROVIDER_OPTIONS.find(option => option.value === defaultType)?.label ?? 'Provider'}`
    });

    updateProviders(providers => ({
      providers: [...providers, provider],
      defaultProviderId: chatSettings.defaultProviderId ?? provider.id,
      selectedProviderId: provider.id
    }));
  };

  const handleSetDefaultProvider = (providerId: string) => {
    updateProviders(providers => ({
      providers,
      defaultProviderId: providerId
    }));
  };

  const handleRemoveProvider = (providerId: string) => {
    if (chatSettings.providers.length <= 1) {
      return;
    }

    updateProviders(providers => {
      const remainingProviders = providers.filter(provider => provider.id !== providerId);
      const nextSelected = remainingProviders[0]?.id ?? null;

      return {
        providers: remainingProviders,
        defaultProviderId:
          chatSettings.defaultProviderId === providerId
            ? remainingProviders[0]?.id
            : chatSettings.defaultProviderId,
        selectedProviderId: selectedProviderId === providerId ? nextSelected : selectedProviderId
      };
    });
  };

  const updateSetting = <K extends keyof ChatPluginSettings>(
    field: K,
    value: ChatPluginSettings[K]
  ) => {
    persistSettings({
      ...chatSettings,
      [field]: value
    });
  };

  const handleFetchModels = async (provider: ChatProviderEntry) => {
    if (fetchedModels.length > 0 || isFetchingModels) return;

    setIsFetchingModels(true);
    setFetchModelsError(null);

    try {
      const result = await window.terminalApp.pluginIpc.invoke<ListModelsResponse>(
        CHAT_IPC_CHANNELS.listModels,
        { provider } satisfies ListModelsPayload
      );

      if (result.error) {
        setFetchModelsError(result.error);
        setFetchedModels([]);
      } else if (result.models) {
        const modelOptions = result.models
          .map(model => ({
            value: model.id,
            label: model.name || model.id
          }))
          .sort(
            (a, b) =>
              a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }) ||
              a.value.localeCompare(b.value, undefined, { numeric: true, sensitivity: 'base' })
          );
        setFetchedModels(modelOptions);
        setFetchModelsError(null);
      }
    } catch (error) {
      setFetchModelsError(error instanceof Error ? error.message : 'Failed to fetch models');
      setFetchedModels([]);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleComboboxOpen = (open: boolean) => {
    if (
      open &&
      selectedProvider &&
      selectedProvider.type === 'custom' &&
      selectedProvider.apiKey &&
      selectedProvider.baseUrl
    ) {
      void handleFetchModels(selectedProvider);
    }
  };

  return (
    <div className="chat-settings">
      <SettingsSection title="Providers">
        <SettingsField
          label="Saved Providers"
          description="Manage named chat providers available in the + menu"
          layout="vertical"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="chat-provider-tabbar-row">
              <div className="chat-provider-tabbar" role="tablist" aria-label="Configured chat providers">
                {chatSettings.providers.map(provider => (
                  <button
                    key={provider.id}
                    type="button"
                    role="tab"
                    aria-selected={provider.id === selectedProvider?.id}
                    className={`chat-provider-tab${provider.id === selectedProvider?.id ? ' is-active' : ''}`}
                    onClick={() => setSelectedProviderId(provider.id)}
                  >
                    <span className="chat-provider-tab-label">{provider.name}</span>
                    {chatSettings.providers.length > 1 ? (
                      <span
                        className="chat-provider-tab-close"
                        role="button"
                        aria-label={`Remove ${provider.name}`}
                        tabIndex={0}
                        onClick={event => {
                          event.stopPropagation();
                          handleRemoveProvider(provider.id);
                        }}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.stopPropagation();
                            event.preventDefault();
                            handleRemoveProvider(provider.id);
                          }
                        }}
                      >
                        ×
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                onClick={handleAddProvider}
                variant="secondary"
                size="medium"
                aria-label="Add provider"
                title="Add provider"
              >
                +
              </Button>
            </div>
          </div>
        </SettingsField>
      </SettingsSection>

      {selectedProvider ? (
        <div className="chat-provider-pane">
          <div className="chat-provider-pane-body">
            <SettingsField label="Provider Name" htmlFor="provider-name">
              <Input
                id="provider-name"
                value={selectedProvider.name}
                onChange={e => updateProvider(selectedProvider.id, { name: e.target.value })}
                placeholder="OpenAI"
              />
            </SettingsField>

            <SettingToggle
              label="Default Provider"
              description="Use this provider for generic new chat actions"
              checked={selectedProvider.id === chatSettings.defaultProviderId}
              onChange={() => handleSetDefaultProvider(selectedProvider.id)}
            />

            <SettingSelect
              label="Provider Type"
              options={PROVIDER_OPTIONS.map(provider => ({
                value: provider.value,
                label: provider.label
              }))}
              value={selectedProvider.type}
              onChange={value => handleProviderTypeChange(selectedProvider.id, value)}
            />

            <SettingsField
              label="API Key"
              description="Stored in settings and used only for this provider"
              layout="vertical"
              htmlFor="api-key"
            >
              <div className="chat-settings-api-key-row">
                <Input
                  id="api-key"
                  aria-label="API Key"
                  type={showApiKey ? 'text' : 'password'}
                  value={selectedProvider.apiKey}
                  onChange={e => updateProvider(selectedProvider.id, { apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  style={{ flex: 1, minWidth: 0 }}
                />
                <Button
                  type="button"
                  onClick={() => setShowApiKey(value => !value)}
                  variant="secondary"
                  size="medium"
                  style={{ flexShrink: 0 }}
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </Button>
              </div>
            </SettingsField>

            <SettingsField
              label="Base URL"
              description={
                selectedProvider.type === 'custom'
                  ? 'Required for OpenAI-compatible providers'
                  : 'Optional override for hosted or proxy endpoints'
              }
              htmlFor="base-url"
            >
              <Input
                id="base-url"
                type="text"
                value={selectedProvider.baseUrl || ''}
                onChange={e => updateProvider(selectedProvider.id, { baseUrl: e.target.value })}
                placeholder={
                  selectedProvider.type === 'custom' ? 'https://api.example.com/v1' : 'Optional'
                }
              />
            </SettingsField>

            {selectedProvider.type !== 'custom' ? (
              <SettingSelect
                label="Model"
                description="Select the AI model to use"
                options={modelOptions}
                value={selectedProvider.model}
                onChange={value => updateProvider(selectedProvider.id, { model: value })}
              />
            ) : (
              <SettingsField
                label="Model Name"
                description="Enter a model name or select from the endpoint"
                htmlFor="model-name"
              >
                <Combobox
                  id="model-name"
                  options={fetchedModels}
                  value={selectedProvider.model}
                  onChange={value => updateProvider(selectedProvider.id, { model: value })}
                  onOpenChange={handleComboboxOpen}
                  loading={isFetchingModels}
                  loadingMessage="Fetching available models..."
                  errorMessage={fetchModelsError || undefined}
                  placeholder="gpt-4o-mini"
                />
              </SettingsField>
            )}

            <SettingsField
              label="Temperature"
              description={
                <span className="chat-settings-range-description">
                  <span>Controls randomness: 0 is focused, 2 is creative</span>
                  <span>{selectedProvider.temperature ?? 0.7}</span>
                </span>
              }
              htmlFor="temperature"
            >
              <input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={selectedProvider.temperature ?? 0.7}
                onChange={e =>
                  updateProvider(selectedProvider.id, { temperature: parseFloat(e.target.value) })
                }
                style={{ width: '100%' }}
              />
            </SettingsField>

            <SettingsField
              label="Max Tokens"
              description="Maximum length of the response"
              htmlFor="max-tokens"
            >
              <Input
                id="max-tokens"
                type="number"
                value={selectedProvider.maxTokens ?? 2000}
                onChange={e =>
                  updateProvider(selectedProvider.id, {
                    maxTokens: parseInt(e.target.value || '0', 10)
                  })
                }
                min={1}
                max={100000}
              />
            </SettingsField>

            {validationError && (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--color-error-bg)',
                  color: 'var(--color-error-text)',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}
              >
                {validationError}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <SettingsSection title="History Settings">
        <SettingToggle
          label="Persist History"
          description="Save chat history to disk per chat pane"
          checked={chatSettings.persistHistory}
          onChange={checked => updateSetting('persistHistory', checked)}
        />

        <SettingsField
          label="Max History Messages"
          description="Maximum messages to keep per chat session"
          htmlFor="max-history"
        >
          <Input
            id="max-history"
            type="number"
            value={chatSettings.maxHistoryMessages}
            onChange={e => updateSetting('maxHistoryMessages', parseInt(e.target.value || '0', 10))}
            min={1}
            max={1000}
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection title="System Prompt">
        <SettingsField
          label="System Prompt"
          description="Instructions sent with every conversation"
          htmlFor="system-prompt"
        >
          <Textarea
            id="system-prompt"
            value={chatSettings.systemPrompt}
            onChange={e => updateSetting('systemPrompt', e.target.value)}
            rows={8}
          />
        </SettingsField>
      </SettingsSection>
    </div>
  );
};
