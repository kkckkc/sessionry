import { useState } from 'react';
import type { SettingsViewProps } from '@sessionry/plugin-api';
import {
  SettingsSection,
  SettingToggle,
  SettingSelect,
  Combobox,
  Input,
  Button,
  Textarea
} from '@sessionry/components';
import type { SelectOption } from '@sessionry/components';

import type { ChatPluginSettings } from './settings';
import { DEFAULT_CHAT_SETTINGS, validateProviderConfig } from './settings';
import { PROVIDER_OPTIONS, PROVIDER_MODELS } from './constants';
import { CHAT_IPC_CHANNELS } from './constants';

interface ListModelsResponse {
  models?: Array<{ id: string; name?: string }>;
  error?: string;
}

export const ChatSettingsView = ({ settings, onUpdate }: SettingsViewProps) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<SelectOption[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchModelsError, setFetchModelsError] = useState<string | null>(null);

  const chatSettings = (settings as ChatPluginSettings) ?? DEFAULT_CHAT_SETTINGS;
  const { provider, systemPrompt, persistHistory, maxHistoryMessages } = chatSettings;

  const modelOptions: SelectOption[] =
    provider.provider === 'custom'
      ? []
      : PROVIDER_MODELS[provider.provider].map(m => ({
          value: m.value,
          label: m.label
        }));

  const updateProviderField = <K extends keyof typeof provider>(
    field: K,
    value: (typeof provider)[K]
  ) => {
    const newProvider = { ...provider, [field]: value };
    const error = validateProviderConfig(newProvider);
    setValidationError(error);

    void onUpdate({
      ...chatSettings,
      provider: newProvider
    });
  };

  const updateSetting = <K extends keyof ChatPluginSettings>(
    field: K,
    value: ChatPluginSettings[K]
  ) => {
    void onUpdate({
      ...chatSettings,
      [field]: value
    });
  };

  const handleFetchModels = async () => {
    // Only fetch if we haven't already or if there was an error
    if (fetchedModels.length > 0 || isFetchingModels) return;

    setIsFetchingModels(true);
    setFetchModelsError(null);

    try {
      const result = await window.terminalApp.pluginIpc.invoke<ListModelsResponse>(
        CHAT_IPC_CHANNELS.listModels
      );

      if (result.error) {
        setFetchModelsError(result.error);
        setFetchedModels([]);
      } else if (result.models) {
        const modelOptions = result.models
          .map(m => ({
            value: m.id,
            label: m.name || m.id
          }))
          .sort((a, b) => (
            a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }) ||
            a.value.localeCompare(b.value, undefined, { numeric: true, sensitivity: 'base' })
          ));
        setFetchedModels(modelOptions);
        setFetchModelsError(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch models';
      setFetchModelsError(errorMessage);
      setFetchedModels([]);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleComboboxOpen = (open: boolean) => {
    if (open && provider.apiKey && provider.baseUrl) {
      void handleFetchModels();
    }
  };

  return (
    <div className="chat-settings">
      <SettingsSection
        title="AI Provider Configuration"
      >
        <SettingSelect
          label="Provider"
          options={PROVIDER_OPTIONS.map(p => ({ value: p.value, label: p.label }))}
          value={provider.provider}
          onChange={value => {
            const newProvider = value as typeof provider.provider;
            const defaultModel =
              newProvider === 'custom' ? '' : PROVIDER_MODELS[newProvider][0].value;
            const newProviderConfig = {
              ...provider,
              provider: newProvider,
              model: defaultModel
            };
            const error = validateProviderConfig(newProviderConfig);
            setValidationError(error);

            void onUpdate({
              ...chatSettings,
              provider: newProviderConfig
            });
          }}
        />

        <div className="chat-settings-field">
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <Input
              id="api-key"
              label="API Key"
              description="Your API key is stored securely and never shared"
              type={showApiKey ? 'text' : 'password'}
              value={provider.apiKey}
              onChange={e => updateProviderField('apiKey', e.target.value)}
              placeholder="Enter your API key"
              style={{ flex: 1, minWidth: 0 }}
            />
            <Button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              variant="secondary"
              size="medium"
              style={{ flexShrink: 0, marginTop: '1.625rem' }}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>

        {provider.provider !== 'custom' && (
          <SettingSelect
            label="Model"
            description="Select the AI model to use"
            options={modelOptions}
            value={provider.model}
            onChange={value => updateProviderField('model', value)}
          />
        )}

        {provider.provider === 'custom' && (
          <>
            <div className="chat-settings-field">
              <Input
                id="base-url"
                label="Base URL"
                description="OpenAI-compatible API endpoint"
                type="text"
                value={provider.baseUrl || ''}
                onChange={e => updateProviderField('baseUrl', e.target.value)}
                placeholder="https://api.example.com/v1"
              />
            </div>

            <div className="chat-settings-field">
              <Combobox
                id="model-name"
                label="Model Name"
                description="Enter model name or select from available models"
                options={fetchedModels}
                value={provider.model}
                onChange={value => updateProviderField('model', value)}
                onOpenChange={handleComboboxOpen}
                loading={isFetchingModels}
                loadingMessage="Fetching available models..."
                errorMessage={fetchModelsError || undefined}
                placeholder="gpt-3.5-turbo"
              />
            </div>
          </>
        )}

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
      </SettingsSection>

      <SettingsSection
        title="Advanced Settings"
      >
        <div style={{ padding: '10px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="temperature"
              style={{
                fontSize: '0.875rem',
                color: 'var(--text)',
                fontWeight: 500
              }}
            >
              Temperature
            </label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={provider.temperature ?? 0.7}
              onChange={e => updateProviderField('temperature', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="input-description" style={{ margin: 0 }}>
                Controls randomness: 0 is focused, 2 is creative
              </p>
              <span style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500 }}>
                {provider.temperature ?? 0.7}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 0' }}>
          <Input
            id="max-tokens"
            label="Max Tokens"
            description="Maximum length of the response"
            type="number"
            value={provider.maxTokens ?? 2000}
            onChange={e => updateProviderField('maxTokens', parseInt(e.target.value, 10))}
            min={1}
            max={100000}
          />
        </div>

        <Textarea
          id="system-prompt"
          label="System Prompt"
          description="Instructions that guide the AI's behavior"
          value={systemPrompt}
          onChange={e => updateSetting('systemPrompt', e.target.value)}
          rows={4}
        />
      </SettingsSection>

      <SettingsSection
        title="History Settings"
      >
        <SettingToggle
          label="Persist chat history"
          description="Save chat conversations across sessions"
          checked={persistHistory}
          onChange={checked => updateSetting('persistHistory', checked)}
        />

        <div style={{ padding: '10px 0' }}>
          <Input
            id="max-messages"
            label="Max messages to keep"
            description="Older messages will be automatically removed"
            type="number"
            value={maxHistoryMessages}
            onChange={e => updateSetting('maxHistoryMessages', parseInt(e.target.value, 10))}
            min={1}
            max={1000}
            disabled={!persistHistory}
          />
        </div>
      </SettingsSection>
    </div>
  );
};
