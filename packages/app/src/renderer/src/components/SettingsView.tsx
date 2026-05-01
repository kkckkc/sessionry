import { useEffect, useState } from 'react'
import type { IconType } from 'react-icons'
import * as TbIcons from 'react-icons/tb'

import { DialogRoot, DialogPortal, DialogBackdrop, DialogPopup, DialogHeader } from '@sessionry/components'
import type { AppSettings } from '@sessionry/plugin-api'
import type { RendererViewRegistration } from '@sessionry/plugin-api'

interface ConfirmationsSettings {
  confirmPaneClose: boolean
  confirmPaneGroupClose: boolean
  confirmSessionClose: boolean
}

interface PluginWithSettings {
  id: string
  name: string
  settingsView: {
    id: string
    title: string
    description?: string
    icon?: string
  }
}

interface SettingsViewProps {
  resolveRendererView: (viewId: string) => RendererViewRegistration | null
  open: boolean
  onClose: () => void
}

const resolveTablerIcon = (name: string): IconType | null => {
  const icon = TbIcons[name as keyof typeof TbIcons]
  return icon ? (icon as IconType) : null
}

export const SettingsView = ({ resolveRendererView, open, onClose }: SettingsViewProps) => {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null)

  useEffect(() => {
    void window.terminalApp.settings.read().then(setSettings)
  }, [])

  useEffect(() => {
    const unsubscribe = window.terminalApp.settings.onChange((newSettings: AppSettings) => {
      setSettings(newSettings)
    })
    return unsubscribe
  }, [])

  const pluginsWithSettings: PluginWithSettings[] = [
    {
      id: 'app-confirmations',
      name: 'Confirmations',
      settingsView: {
        id: 'settings.confirmations',
        title: 'Confirmations',
        description: 'Configure confirmation dialogs for destructive actions',
        icon: 'TbAlertCircle'
      }
    },
    {
      id: 'plugin-default-view-terminal',
      name: 'Terminal',
      settingsView: {
        id: 'settings.terminal',
        title: 'Terminal',
        description: 'Configure terminal and tmux settings',
        icon: 'TbTerminal'
      }
    }
  ]

  useEffect(() => {
    if (!selectedPluginId && pluginsWithSettings.length > 0) {
      setSelectedPluginId(pluginsWithSettings[0].id)
    }
  }, [selectedPluginId, pluginsWithSettings.length])

  const selectedPlugin = pluginsWithSettings.find((p) => p.id === selectedPluginId)

  const handleUpdateSettings = async (pluginId: string, updates: unknown) => {
    if (!settings) return
    
    // Handle built-in confirmations settings (not a plugin)
    if (pluginId === 'app-confirmations') {
      await window.terminalApp.settings.update({
        confirmations: updates as ConfirmationsSettings
      })
      return
    }
    
    // Handle plugin settings
    await window.terminalApp.settings.update({
      plugins: {
        ...settings.plugins,
        [pluginId]: updates
      }
    })
  }

  return (
    <DialogRoot open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogPortal>
        <DialogBackdrop className="dialog-backdrop" />
        <DialogPopup className="dialog settings-modal">
          <DialogHeader title="Settings" showClose onClose={onClose} />
          <div className="settings-modal-body">
            <nav className="settings-modal-nav">
              {pluginsWithSettings.map((plugin) => {
                const Icon = plugin.settingsView.icon ? resolveTablerIcon(plugin.settingsView.icon) : null
                const isActive = selectedPluginId === plugin.id
                return (
                  <button
                    key={plugin.id}
                    className={`settings-modal-nav-item${isActive ? ' is-active' : ''}`}
                    onClick={() => setSelectedPluginId(plugin.id)}
                  >
                    {Icon && <Icon size={14} />}
                    <span>{plugin.settingsView.title}</span>
                  </button>
                )
              })}
            </nav>

            <div className="settings-modal-content">
              {selectedPlugin && (
                <div className="settings-modal-section-title">{selectedPlugin.settingsView.title}</div>
              )}
              {settings === null ? (
                <div className="settings-modal-loading">Loading settings…</div>
              ) : selectedPlugin ? (
                <PluginSettingsContent
                  plugin={selectedPlugin}
                  settings={settings.plugins[selectedPlugin.id]}
                  onUpdate={(updates) => handleUpdateSettings(selectedPlugin.id, updates)}
                  resolveRendererView={resolveRendererView}
                />
              ) : (
                <div className="settings-modal-empty">No settings available</div>
              )}
            </div>
          </div>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  )
}

interface PluginSettingsContentProps {
  plugin: PluginWithSettings
  settings: unknown
  onUpdate: (updates: unknown) => Promise<void>
  resolveRendererView: (viewId: string) => RendererViewRegistration | null
}

const PluginSettingsContent = ({ plugin, settings, onUpdate, resolveRendererView }: PluginSettingsContentProps) => {
  // Handle built-in confirmations settings
  if (plugin.id === 'app-confirmations') {
    return <ConfirmationsSettingsView settings={settings as ConfirmationsSettings} onUpdate={onUpdate} />
  }

  const registration = resolveRendererView(plugin.settingsView.id)

  if (!registration) {
    return <div className="settings-modal-empty">Settings view not found for {plugin.name}</div>
  }

  const Component = registration.component
  return <Component pluginId={plugin.id} settings={settings} onUpdate={onUpdate} />
}

interface ConfirmationsSettingsViewProps {
  settings: ConfirmationsSettings
  onUpdate: (updates: unknown) => Promise<void>
}

const ConfirmationsSettingsView = ({ settings, onUpdate }: ConfirmationsSettingsViewProps) => {
  // Provide defaults if settings are undefined (for existing installations)
  const confirmations: ConfirmationsSettings = settings ?? {
    confirmPaneClose: true,
    confirmPaneGroupClose: true,
    confirmSessionClose: true
  }

  const updateSetting = (key: keyof ConfirmationsSettings, value: boolean) => {
    void onUpdate({ ...confirmations, [key]: value })
  }

  return (
    <div className="confirmations-settings">
      <div className="settings-section">
        <div className="settings-section-header">
          <h2>Close Confirmations</h2>
          <p>Configure when to show confirmation dialogs before closing items</p>
        </div>
        <div className="settings-section-content">
          <div className="setting-control setting-toggle">
            <div className="setting-control-header">
              <label>
                <input
                  type="checkbox"
                  checked={confirmations.confirmPaneClose}
                  onChange={(e) => updateSetting('confirmPaneClose', e.target.checked)}
                  className="toggle-input"
                />
                <span className="toggle-switch" />
                <span className="setting-label">Confirm pane close</span>
              </label>
            </div>
            <p className="setting-description">
              Show a confirmation dialog when closing individual panes (terminals, editors, etc.)
            </p>
          </div>

          <div className="setting-control setting-toggle">
            <div className="setting-control-header">
              <label>
                <input
                  type="checkbox"
                  checked={confirmations.confirmPaneGroupClose}
                  onChange={(e) => updateSetting('confirmPaneGroupClose', e.target.checked)}
                  className="toggle-input"
                />
                <span className="toggle-switch" />
                <span className="setting-label">Confirm pane group close</span>
              </label>
            </div>
            <p className="setting-description">
              Show a confirmation dialog when closing pane groups (tabs or splits containing multiple panes)
            </p>
          </div>

          <div className="setting-control setting-toggle">
            <div className="setting-control-header">
              <label>
                <input
                  type="checkbox"
                  checked={confirmations.confirmSessionClose}
                  onChange={(e) => updateSetting('confirmSessionClose', e.target.checked)}
                  className="toggle-input"
                />
                <span className="toggle-switch" />
                <span className="setting-label">Confirm session close</span>
              </label>
            </div>
            <p className="setting-description">
              Show a confirmation dialog when closing entire sessions (all panes in a workspace)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
