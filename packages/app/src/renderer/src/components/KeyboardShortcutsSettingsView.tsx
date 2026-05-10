import { useEffect, useState } from 'react';
import type { ActionDescriptor } from '@sessionry/plugin-api';
import { SettingsSection, Button } from '@sessionry/components';
import {
  detectKeybindingConflicts,
  type KeybindingOverrides,
  type KeybindingConflict
} from '../lib/keybindings';
import { KeyboardShortcutInput } from './KeyboardShortcutInput';
import './KeyboardShortcutsSettings.css';

const formatKeybindingForDisplay = (keybinding: string): string => {
  if (!keybinding) return '';

  const parts = keybinding.split('-');
  return parts
    .map((part, index) => {
      if (part === 'C') return navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl';
      if (part === 'M') return navigator.platform.includes('Mac') ? 'Option' : 'Alt';
      if (part === 'Shift') return 'Shift';
      // Treat 'S' as Shift only if it's not the last part
      if (part === 'S' && index < parts.length - 1) return 'Shift';
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('+');
};

interface KeyboardShortcutsSettingsViewProps {
  settings: KeybindingOverrides;
  onUpdate: (updates: KeybindingOverrides) => Promise<void>;
}

export const KeyboardShortcutsSettingsView = ({
  settings,
  onUpdate
}: KeyboardShortcutsSettingsViewProps) => {
  const [actions, setActions] = useState<ActionDescriptor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [conflicts, setConflicts] = useState<KeybindingConflict[]>([]);

  useEffect(() => {
    void window.terminalApp.actions.list().then(setActions);
  }, []);

  useEffect(() => {
    const detected = detectKeybindingConflicts(actions, settings.custom, settings.disabled);
    setConflicts(detected);
  }, [actions, settings.custom, settings.disabled]);

  const filteredActions = actions.filter(action => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      action.name.toLowerCase().includes(query) ||
      action.id.toLowerCase().includes(query) ||
      action.category?.toLowerCase().includes(query)
    );
  });

  const groupedActions = filteredActions.reduce(
    (groups, action) => {
      const category = action.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(action);
      return groups;
    },
    {} as Record<string, ActionDescriptor[]>
  );

  const handleKeybindingChange = (actionId: string, keybinding: string) => {
    const updated = {
      ...settings,
      custom: { ...settings.custom, [actionId]: keybinding }
    };
    void onUpdate(updated);
  };

  const handleDisableToggle = (actionId: string, disabled: boolean) => {
    const updated = {
      ...settings,
      disabled: disabled
        ? [...settings.disabled, actionId]
        : settings.disabled.filter(id => id !== actionId)
    };
    void onUpdate(updated);
  };

  const handleResetToDefault = (actionId: string) => {
    const { [actionId]: _, ...rest } = settings.custom;
    const updated = {
      ...settings,
      custom: rest,
      disabled: settings.disabled.filter(id => id !== actionId)
    };
    void onUpdate(updated);
  };

  const handleResetAll = () => {
    void onUpdate({ custom: {}, disabled: [] });
  };

  return (
    <div className="keyboard-shortcuts-settings">
      <div className="keyboard-shortcuts-header">
        <input
          type="text"
          placeholder="Search actions..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="keyboard-shortcuts-search"
        />
        <Button onClick={handleResetAll} variant="secondary">
          Reset All
        </Button>
      </div>

      {conflicts.length > 0 && (
        <div className="keyboard-shortcuts-conflicts">
          <strong>⚠️ Keybinding Conflicts:</strong>
          <ul>
            {conflicts.map(conflict => {
              const actionNames = conflict.actionIds
                .map(id => actions.find(a => a.id === id)?.name || id)
                .join(', ');
              return (
                <li key={conflict.keybinding}>
                  <code>{formatKeybindingForDisplay(conflict.keybinding)}</code>: {actionNames}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="keyboard-shortcuts-list">
        {Object.entries(groupedActions)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, categoryActions]) => (
            <SettingsSection key={category} title={category}>
              {categoryActions
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(action => {
                  const customKeybinding = settings.custom[action.id];
                  const isDisabled = settings.disabled.includes(action.id);
                  const currentKeybinding = customKeybinding ?? action.defaultKeybinding ?? '';
                  const isCustomized = customKeybinding !== undefined || isDisabled;

                  return (
                    <div key={action.id} className="keyboard-shortcut-row">
                      <input
                        type="checkbox"
                        className="keyboard-shortcut-enabled"
                        checked={!isDisabled}
                        onChange={e => handleDisableToggle(action.id, !e.target.checked)}
                        title={isDisabled ? 'Enable keybinding' : 'Disable keybinding'}
                      />
                      <div className="keyboard-shortcut-info">
                        <div className="keyboard-shortcut-name">{action.name}</div>
                      </div>
                      <KeyboardShortcutInput
                        value={currentKeybinding}
                        onChange={value => handleKeybindingChange(action.id, value)}
                        onReset={() => handleResetToDefault(action.id)}
                        disabled={isDisabled}
                        hasCustomValue={isCustomized}
                      />
                    </div>
                  );
                })}
            </SettingsSection>
          ))}
      </div>
    </div>
  );
};
