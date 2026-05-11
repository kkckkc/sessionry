import { useState } from 'react';
import type { SettingsViewProps } from '@sessionry/plugin-api';
import {
  SettingsSection,
  SettingToggle,
  SettingSelect,
  Input
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
        description="Configure your AI provider and authentication"
      >
        <SettingSelect
          label="Provider"
          description="Select your AI provider"
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

        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="api-key"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            API Key
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Input
              id="api-key"
              type={showApiKey ? 'text' : 'password'}
              value={provider.apiKey}
              onChange={e => updateProviderField('apiKey', e.target.value)}
              placeholder="Enter your API key"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>
            Your API key is stored securely and never shared
          </p>
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
            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="base-url"
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Base URL
              </label>
              <Input
                id="base-url"
                type="text"
                value={provider.baseUrl || ''}
                onChange={e => updateProviderField('baseUrl', e.target.value)}
                placeholder="https://api.example.com/v1"
              />
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>
                OpenAI-compatible API endpoint
              </p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="model-name"
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Model Name
              </label>
              <Input
                id="model-name"
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
        description="Fine-tune the AI behavior"
      >
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="temperature"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            Temperature: {provider.temperature ?? 0.7}
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
          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>
            Controls randomness: 0 is focused, 2 is creative
          </p>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="max-tokens"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            Max Tokens
          </label>
          <Input
            id="max-tokens"
            type="number"
            value={provider.maxTokens ?? 2000}
            onChange={e => updateProviderField('maxTokens', parseInt(e.target.value, 10))}
            min={1}
            max={100000}
          />
          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>
            Maximum length of the response
          </p>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="system-prompt"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            System Prompt
          </label>
          <textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={e => updateSetting('systemPrompt', e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>
            Instructions that guide the AI's behavior
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title="History Settings"
        description="Configure chat history persistence"
      >
        <SettingToggle
          label="Persist chat history"
          description="Save chat conversations across sessions"
          checked={persistHistory}
          onChange={checked => updateSetting('persistHistory', checked)}
        />

        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="max-messages"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            Max messages to keep
          </label>
          <Input
            id="max-messages"
            type="number"
            value={maxHistoryMessages}
            onChange={e => updateSetting('maxHistoryMessages', parseInt(e.target.value, 10))}
            min={1}
            max={1000}
            disabled={!persistHistory}
          />
          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>
            Older messages will be automatically removed
          </p>
        </div>
      </SettingsSection>
    </div>
  );
};
