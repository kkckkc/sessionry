import { useEffect, useRef, useState } from 'react';
import { Button, SettingsSection } from '@sessionry/components';
import type { SettingsViewProps } from '@sessionry/plugin-api';
import { TbTrash } from 'react-icons/tb';

import {
  createEmptyPreset,
  getTerminalPresetsSettings,
  type TerminalPreset,
  type TerminalPresetsPluginSettings
} from './settings';
import './styles.css';

const normalizeDraft = (preset: TerminalPreset): TerminalPreset => ({
  ...preset,
  name: preset.name.trim(),
  command: preset.command.trim()
});

export const TerminalPresetsSettingsView = ({ settings, onUpdate }: SettingsViewProps) => {
  const initialPresets = getTerminalPresetsSettings(settings).presets;
  const [draftPresets, setDraftPresets] = useState<TerminalPreset[]>(initialPresets);
  const persistedSignatureRef = useRef(
    JSON.stringify(initialPresets.map(normalizeDraft).filter(preset => preset.name && preset.command))
  );

  useEffect(() => {
    const nextPresets = getTerminalPresetsSettings(settings).presets;
    const nextSignature = JSON.stringify(
      nextPresets.map(normalizeDraft).filter(preset => preset.name && preset.command)
    );

    if (nextSignature !== persistedSignatureRef.current) {
      persistedSignatureRef.current = nextSignature;
      setDraftPresets(nextPresets);
    }
  }, [settings]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextSettings: TerminalPresetsPluginSettings = {
        presets: draftPresets.map(normalizeDraft).filter(preset => preset.name && preset.command)
      };
      const nextSignature = JSON.stringify(nextSettings.presets);
      if (nextSignature === persistedSignatureRef.current) return;

      persistedSignatureRef.current = nextSignature;
      void onUpdate(nextSettings);
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [draftPresets, onUpdate]);

  const updatePreset = (presetId: string, updates: Partial<TerminalPreset>) => {
    const nextPresets = draftPresets.map(preset =>
      preset.id === presetId ? { ...preset, ...updates } : preset
    );
    setDraftPresets(nextPresets);
  };

  const removePreset = (presetId: string) => {
    setDraftPresets(currentPresets => currentPresets.filter(preset => preset.id !== presetId));
  };

  const addPreset = () => {
    setDraftPresets(currentPresets => [...currentPresets, createEmptyPreset()]);
  };

  return (
    <div data-plugin-id="plugin-default-terminal-presets" data-plugin-surface="settings">
      <SettingsSection
        title="Presets"
        description="Add reusable commands to the new pane menu for stacked tab groups."
      >
        <div className="terminal-presets-settings">
          <table className="terminal-presets-settings__grid" aria-label="Terminal presets">
            <thead>
              <tr className="terminal-presets-settings__header">
                <th scope="col">Name</th>
                <th scope="col">Command</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {draftPresets.map((preset: TerminalPreset, index: number) => (
                <tr key={preset.id} className="terminal-presets-settings__row">
                  <td>
                    <input
                      className="terminal-presets-settings__input"
                      type="text"
                      value={preset.name}
                      onChange={event => updatePreset(preset.id, { name: event.target.value })}
                      placeholder="Dev server"
                      aria-label={`Preset ${index + 1} name`}
                    />
                  </td>
                  <td>
                    <input
                      className="terminal-presets-settings__input terminal-presets-settings__input--mono"
                      type="text"
                      value={preset.command}
                      onChange={event => updatePreset(preset.id, { command: event.target.value })}
                      placeholder="pnpm dev"
                      aria-label={`Preset ${index + 1} command`}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="terminal-presets-settings__delete"
                      title="Delete preset"
                      aria-label={`Delete preset ${index + 1}`}
                      onClick={() => removePreset(preset.id)}
                    >
                      <TbTrash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Button variant="secondary" className="terminal-presets-settings__add" onClick={addPreset}>
            Add preset
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
};
