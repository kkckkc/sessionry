import { useState, useEffect } from 'react';
import type { SettingsViewProps } from '@sessionry/plugin-api';
import { SettingsSection, SettingToggle, SettingSelect } from '@sessionry/components';
import type { SelectOption } from '@sessionry/components';

import type { TerminalPluginSettings, TmuxSettings } from './settings';
import { getMonospaceFonts } from './fontDetection';

export const TerminalSettingsView = ({ settings, onUpdate }: SettingsViewProps) => {
  const [fontOptions, setFontOptions] = useState<SelectOption[]>([]);
  const [isLoadingFonts, setIsLoadingFonts] = useState(true);

  const terminalSettings = (settings as TerminalPluginSettings) ?? {
    fontFamily: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
    tmux: {
      enabled: false,
      dedicatedSocket: true,
      disableStatusBar: false,
      inheritConfig: true,
      killOnExit: true
    }
  };

  const tmuxSettings: TmuxSettings = terminalSettings.tmux;
  const currentFont =
    terminalSettings.fontFamily || '"JetBrains Mono", "SF Mono", ui-monospace, monospace';

  // Extract the first font family from the CSS font-family string
  const extractFirstFont = (fontFamily: string): string => {
    // Remove quotes and get first font in the list
    const match = fontFamily.match(/^"?([^",]+)"?/);
    return match ? match[1].trim() : fontFamily;
  };

  const selectedFontValue = extractFirstFont(currentFont);

  // Load available fonts on mount
  useEffect(() => {
    const loadFonts = async () => {
      try {
        const fonts = await getMonospaceFonts();
        const options: SelectOption[] = fonts.map(font => ({
          value: font.family,
          label: font.displayName
        }));
        setFontOptions(options);
      } catch (error) {
        console.error('[TerminalSettings] Failed to load fonts:', error);
        // Provide fallback options
        setFontOptions([
          { value: 'monospace', label: 'System Monospace' },
          { value: 'ui-monospace', label: 'UI Monospace' }
        ]);
      } finally {
        setIsLoadingFonts(false);
      }
    };

    void loadFonts();
  }, []);

  const updateTmuxSetting = (key: keyof TmuxSettings, value: boolean) => {
    void onUpdate({
      fontFamily: currentFont,
      tmux: { ...tmuxSettings, [key]: value }
    });
  };

  const updateFontFamily = (fontFamily: string) => {
    // Build font family string with fallbacks
    const fontWithFallbacks =
      fontFamily === 'monospace' || fontFamily === 'ui-monospace'
        ? fontFamily
        : `"${fontFamily}", ui-monospace, monospace`;

    void onUpdate({
      fontFamily: fontWithFallbacks,
      tmux: tmuxSettings
    });
  };

  return (
    <div className="terminal-settings">
      <SettingsSection title="Appearance" description="Configure the terminal's visual appearance">
        <SettingSelect
          label="Font Family"
          description="Choose the monospace font for terminal text. Changes apply to new terminal sessions."
          options={fontOptions}
          value={selectedFontValue}
          onChange={updateFontFamily}
          disabled={isLoadingFonts}
        />
      </SettingsSection>

      <SettingsSection
        title="Tmux Integration"
        description="Configure how Sessionry integrates with tmux for session persistence"
      >
        <SettingToggle
          label="Enable tmux"
          description="Use tmux to keep sessions alive across restarts. When enabled, terminal sessions will persist even if Sessionry is closed."
          checked={tmuxSettings.enabled}
          onChange={checked => updateTmuxSetting('enabled', checked)}
        />

        <SettingToggle
          label="Dedicated socket"
          description="Use a dedicated tmux socket (-L sessionry) isolated from your own tmux sessions. Recommended to avoid conflicts."
          checked={tmuxSettings.dedicatedSocket}
          onChange={checked => updateTmuxSetting('dedicatedSocket', checked)}
          disabled={!tmuxSettings.enabled}
        />

        <SettingToggle
          label="Disable status bar"
          description="Disable the tmux status bar inside Sessionry panes for a cleaner interface."
          checked={tmuxSettings.disableStatusBar}
          onChange={checked => updateTmuxSetting('disableStatusBar', checked)}
          disabled={!tmuxSettings.enabled}
        />

        <SettingToggle
          label="Inherit config"
          description="Inherit your ~/.tmux.conf configuration. When disabled, tmux starts with no config (-f /dev/null)."
          checked={tmuxSettings.inheritConfig}
          onChange={checked => updateTmuxSetting('inheritConfig', checked)}
          disabled={!tmuxSettings.enabled}
        />

        <SettingToggle
          label="Kill on exit"
          description="Kill tmux sessions (and the dedicated server, if applicable) when Sessionry exits. When disabled, sessions will persist in the background."
          checked={tmuxSettings.killOnExit}
          onChange={checked => updateTmuxSetting('killOnExit', checked)}
          disabled={!tmuxSettings.enabled}
        />
      </SettingsSection>
    </div>
  );
};
