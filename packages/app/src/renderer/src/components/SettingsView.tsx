import { useEffect, useState } from 'react'
import type { IconType } from 'react-icons'
import * as TbIcons from 'react-icons/tb'

import type { AppSettings } from '@sessionry/plugin-api'
import type { RendererViewRegistration } from '@sessionry/plugin-api'

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

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const selectedPlugin = pluginsWithSettings.find((p) => p.id === selectedPluginId)

  const handleUpdateSettings = async (pluginId: string, updates: unknown) => {
    if (!settings) return
    await window.terminalApp.settings.update({
      plugins: {
        ...settings.plugins,
        [pluginId]: updates
      }
    })
  }

  return (
    <div
      className="settings-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="settings-modal">
        <div className="settings-modal-header">
          <span className="settings-modal-title">Settings</span>
          <button className="settings-modal-close" onClick={onClose} aria-label="Close settings">
            <TbIcons.TbX size={14} />
          </button>
        </div>

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
      </div>
    </div>
  )
}

interface PluginSettingsContentProps {
  plugin: PluginWithSettings
  settings: unknown
  onUpdate: (updates: unknown) => Promise<void>
  resolveRendererView: (viewId: string) => RendererViewRegistration | null
}

const PluginSettingsContent = ({ plugin, settings, onUpdate, resolveRendererView }: PluginSettingsContentProps) => {
  const registration = resolveRendererView(plugin.settingsView.id)

  if (!registration) {
    return <div className="settings-modal-empty">Settings view not found for {plugin.name}</div>
  }

  const Component = registration.component
  return <Component pluginId={plugin.id} settings={settings} onUpdate={onUpdate} />
}
