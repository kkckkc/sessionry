import type { SettingsViewProps } from '@sessionry/plugin-api';
import { SettingsSection, SettingToggle } from '@sessionry/components';

import type { TerminalPluginSettings, TmuxSettings } from './settings';

export const TerminalSettingsView = ({ settings, onUpdate }: SettingsViewProps) => {
  const tmuxSettings: TmuxSettings = (settings as TerminalPluginSettings)?.tmux ?? {
    enabled: false,
    dedicatedSocket: true,
    disableStatusBar: false,
    inheritConfig: true,
    killOnExit: true
  };

  const updateTmuxSetting = (key: keyof TmuxSettings, value: boolean) => {
    void onUpdate({
      tmux: { ...tmuxSettings, [key]: value }
    });
  };

  return (
    <div className="terminal-settings">
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
