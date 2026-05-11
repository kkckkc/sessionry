import { useState } from 'react';
import type { SettingsViewProps } from '@sessionry/plugin-api';
import {
  SettingsSection,
  SettingToggle,
  SettingSelect,
  Input,
  Button,
  Textarea
} from '@sessionry/components';
import type { SelectOption } from '@sessionry/components';

import type { ChatPluginSettings } from './settings';
import { DEFAULT_CHAT_SETTINGS, validateProviderConfig } from './settings';
import { PROVIDER_OPTIONS, PROVIDER_MODELS } from './constants';

export const ChatSettingsView = ({ settings, onUpdate }: SettingsViewProps) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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

        <div style={{ padding: '10px 0' }}>
          <label className="input-label" htmlFor="api-key">API Key</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
            <Input
              id="api-key"
              type={showApiKey ? 'text' : 'password'}
              value={provider.apiKey}
              onChange={e => updateProviderField('apiKey', e.target.value)}
              placeholder="Enter your API key"
              style={{ flex: 1, minWidth: 0 }}
              className="input-field"
            />
            <Button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              variant="secondary"
              size="medium"
              style={{ flexShrink: 0 }}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </Button>
          </div>
          <p className="input-description" style={{ marginTop: '0.25rem' }}>Your API key is stored securely and never shared</p>
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
            <div style={{ padding: '10px 0' }}>
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

            <div style={{ padding: '10px 0' }}>
              <Input
                id="model-name"
                label="Model Name"
                type="text"
                value={provider.model}
                onChange={e => updateProviderField('model', e.target.value)}
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
