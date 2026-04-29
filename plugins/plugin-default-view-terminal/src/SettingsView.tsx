import type { SettingsViewProps } from '@sessionry/plugin-api'

import type { TerminalPluginSettings, TmuxSettings } from './settings'

// Note: These components will be available via the host bundle at runtime
// For now, we'll define them inline to avoid build issues
const SettingsSection = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <section className="settings-section">
    <div className="settings-section-header">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    <div className="settings-section-content">{children}</div>
  </section>
)

const SettingToggle = ({ 
  label, 
  description, 
  value, 
  onChange, 
  disabled 
}: { 
  label: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) => (
  <div className="setting-control setting-toggle">
    <div className="setting-control-header">
      <label>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="toggle-input"
        />
        <span className="toggle-switch" />
        <span className="setting-label">{label}</span>
      </label>
    </div>
    {description && <p className="setting-description">{description}</p>}
  </div>
)

export const TerminalSettingsView = ({ settings, onUpdate }: SettingsViewProps) => {
  const tmuxSettings: TmuxSettings = (settings as TerminalPluginSettings)?.tmux ?? {
    enabled: false,
    dedicatedSocket: true,
    disableStatusBar: false,
    inheritConfig: true,
    killOnExit: true
  }

  const updateTmuxSetting = (key: keyof TmuxSettings, value: boolean) => {
    void onUpdate({
      tmux: { ...tmuxSettings, [key]: value }
    })
  }

  return (
    <div className="terminal-settings">
      <header className="settings-header">
        <h1>Terminal Settings</h1>
        <p>Configure terminal behavior and tmux integration</p>
      </header>

      <SettingsSection
        title="Tmux Integration"
        description="Configure how Sessionry integrates with tmux for session persistence"
      >
        <SettingToggle
          label="Enable tmux"
          description="Use tmux to keep sessions alive across restarts. When enabled, terminal sessions will persist even if Sessionry is closed."
          value={tmuxSettings.enabled}
          onChange={(value) => updateTmuxSetting('enabled', value)}
        />

        <SettingToggle
          label="Dedicated socket"
          description="Use a dedicated tmux socket (-L sessionry) isolated from your own tmux sessions. Recommended to avoid conflicts."
          value={tmuxSettings.dedicatedSocket}
          onChange={(value) => updateTmuxSetting('dedicatedSocket', value)}
          disabled={!tmuxSettings.enabled}
        />

        <SettingToggle
          label="Disable status bar"
          description="Disable the tmux status bar inside Sessionry panes for a cleaner interface."
          value={tmuxSettings.disableStatusBar}
          onChange={(value) => updateTmuxSetting('disableStatusBar', value)}
          disabled={!tmuxSettings.enabled}
        />

        <SettingToggle
          label="Inherit config"
          description="Inherit your ~/.tmux.conf configuration. When disabled, tmux starts with no config (-f /dev/null)."
          value={tmuxSettings.inheritConfig}
          onChange={(value) => updateTmuxSetting('inheritConfig', value)}
          disabled={!tmuxSettings.enabled}
        />

        <SettingToggle
          label="Kill on exit"
          description="Kill tmux sessions (and the dedicated server, if applicable) when Sessionry exits. When disabled, sessions will persist in the background."
          value={tmuxSettings.killOnExit}
          onChange={(value) => updateTmuxSetting('killOnExit', value)}
          disabled={!tmuxSettings.enabled}
        />
      </SettingsSection>
    </div>
  )
}
