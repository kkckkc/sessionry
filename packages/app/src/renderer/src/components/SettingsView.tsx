import { useEffect, useState } from 'react'
import type { IconType } from 'react-icons'
import * as TbIcons from 'react-icons/tb'

import {
  DialogRoot,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogHeader,
  ConfirmationDialog,
  SettingsSection,
  SettingToggle,
  SettingSelect,
  SettingColorInput
} from '@sessionry/components'
import type { AppSettings, AppTheme, ThemeId } from '@sessionry/plugin-api'
import type { RendererViewRegistration } from '@sessionry/plugin-api'
import { PluginSurface } from './PluginSurface'
import { applyTheme, applyColorTheme } from '../lib/theme'
import { 
  usePluginManager,
  PluginCard,
  SearchBar,
  TabNavigation,
  StatusBar
} from '../../components/PluginManager'

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
      id: 'app-appearance',
      name: 'Appearance',
      settingsView: {
        id: 'settings.appearance',
        title: 'Appearance',
        description: 'Configure the visual appearance of the app',
        icon: 'TbPalette'
      }
    },
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
      id: 'app-plugins',
      name: 'Plugins',
      settingsView: {
        id: 'settings.plugins',
        title: 'Plugins',
        description: 'Manage installed plugins and discover new ones',
        icon: 'TbPuzzle'
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
  const selectedSettings =
    settings === null || !selectedPlugin
      ? null
      : selectedPlugin.id === 'app-appearance'
        ? {
            theme: settings.theme ?? 'system',
            colorTheme: settings.colorTheme ?? 'default',
            terminalBgOverride: settings.terminalBgOverride ?? false,
            terminalBgColor: settings.terminalBgColor ?? '#000000'
          }
        : selectedPlugin.id === 'app-confirmations'
          ? settings.confirmations
          : settings.plugins[selectedPlugin.id]

  const handleUpdateSettings = async (pluginId: string, updates: unknown) => {
    if (!settings) return
    
    // Handle built-in appearance settings
    if (pluginId === 'app-appearance') {
      const { theme, colorTheme, terminalBgOverride, terminalBgColor } = updates as {
        theme: AppTheme
        colorTheme: ThemeId
        terminalBgOverride: boolean
        terminalBgColor: string
      }
      const nextSettings: AppSettings = { ...settings, theme, colorTheme, terminalBgOverride, terminalBgColor }
      setSettings(nextSettings)
      applyTheme(theme)
      applyColorTheme(colorTheme, terminalBgOverride, terminalBgColor)
      await window.terminalApp.settings.update({ theme, colorTheme, terminalBgOverride, terminalBgColor })
      return
    }

    // Handle built-in confirmations settings (not a plugin)
    if (pluginId === 'app-confirmations') {
      const nextSettings: AppSettings = {
        ...settings,
        confirmations: updates as ConfirmationsSettings
      }
      setSettings(nextSettings)
      await window.terminalApp.settings.update({
        confirmations: updates as ConfirmationsSettings
      })
      return
    }
    
    // Handle plugin settings
    const nextSettings: AppSettings = {
      ...settings,
      plugins: {
        ...settings.plugins,
        [pluginId]: updates
      }
    }
    setSettings(nextSettings)
    await window.terminalApp.settings.update({
      plugins: nextSettings.plugins
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
                  settings={selectedSettings}
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
  // Handle built-in appearance settings
  if (plugin.id === 'app-appearance') {
    return (
      <PluginSurface pluginId={plugin.id} surface="settings" slot="settings" viewId={plugin.settingsView.id}>
        <AppearanceSettingsView settings={settings as { theme: AppTheme; colorTheme: ThemeId; terminalBgOverride: boolean; terminalBgColor: string }} onUpdate={onUpdate} />
      </PluginSurface>
    )
  }

  // Handle built-in confirmations settings
  if (plugin.id === 'app-confirmations') {
    return (
      <PluginSurface
        pluginId={plugin.id}
        surface="settings"
        slot="settings"
        viewId={plugin.settingsView.id}
      >
        <ConfirmationsSettingsView settings={settings as ConfirmationsSettings} onUpdate={onUpdate} />
      </PluginSurface>
    )
  }

  // Handle built-in plugin manager
  if (plugin.id === 'app-plugins') {
    return (
      <PluginSurface
        pluginId={plugin.id}
        surface="settings"
        slot="settings"
        viewId={plugin.settingsView.id}
      >
        <PluginManagerSettingsView />
      </PluginSurface>
    )
  }

  const registration = resolveRendererView(plugin.settingsView.id)

  if (!registration) {
    return <div className="settings-modal-empty">Settings view not found for {plugin.name}</div>
  }

  const Component = registration.component
  return (
    <PluginSurface
      pluginId={plugin.id}
      surface="settings"
      slot="settings"
      viewId={plugin.settingsView.id}
    >
      <Component pluginId={plugin.id} settings={settings} onUpdate={onUpdate} />
    </PluginSurface>
  )
}

interface AppearanceSettingsViewProps {
  settings: { theme: AppTheme; colorTheme: ThemeId; terminalBgOverride: boolean; terminalBgColor: string }
  onUpdate: (updates: unknown) => Promise<void>
}

const THEME_OPTIONS: { value: AppTheme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' }
]

const AppearanceSettingsView = ({ settings, onUpdate }: AppearanceSettingsViewProps) => {
  const [colorThemeOptions, setColorThemeOptions] = useState<{ value: string; label: string }[]>([])
  
  const theme = settings?.theme ?? 'system'
  const colorTheme = settings?.colorTheme ?? 'default'
  const terminalBgOverride = settings?.terminalBgOverride ?? false
  const terminalBgColor = settings?.terminalBgColor ?? '#000000'

  useEffect(() => {
    const themeApi = window.terminalApp.themes
    if (!themeApi?.getAllThemes) {
      return
    }

    void themeApi.getAllThemes().then((themes) => {
      const options = themes.map((t) => ({
        value: t.id,
        label: t.name
      }))
      setColorThemeOptions(options)
    })
  }, [])

  const update = (partial: Partial<typeof settings>) =>
    void onUpdate({ theme, colorTheme, terminalBgOverride, terminalBgColor, ...partial })

  return (
    <div className="appearance-settings">
      <SettingsSection title="Theme">
        <SettingSelect
          label="UI theme"
          options={THEME_OPTIONS}
          value={theme}
          onChange={(value) => update({ theme: value as AppTheme })}
        />
        <SettingSelect
          label="Color theme"
          options={colorThemeOptions}
          value={colorTheme}
          onChange={(value) => update({ colorTheme: value })}
        />
      </SettingsSection>
      <SettingsSection title="Background Override">
        <SettingToggle
          label="Override background color"
          description="Use a custom background color instead of the theme's default"
          checked={terminalBgOverride}
          onChange={(checked) => update({ terminalBgOverride: checked })}
        />
        <SettingColorInput
          label="Background color"
          value={terminalBgColor}
          onChange={(value) => update({ terminalBgColor: value })}
          disabled={!terminalBgOverride}
        />
      </SettingsSection>
    </div>
  )
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
      <SettingsSection
        title="Close Confirmations"
        description="Configure when to show confirmation dialogs before closing items"
      >
        <SettingToggle
          label="Confirm pane close"
          description="Show a confirmation dialog when closing individual panes (terminals, editors, etc.)"
          checked={confirmations.confirmPaneClose}
          onChange={(checked) => updateSetting('confirmPaneClose', checked)}
        />

        <SettingToggle
          label="Confirm pane group close"
          description="Show a confirmation dialog when closing pane groups (tabs or splits containing multiple panes)"
          checked={confirmations.confirmPaneGroupClose}
          onChange={(checked) => updateSetting('confirmPaneGroupClose', checked)}
        />

        <SettingToggle
          label="Confirm session close"
          description="Show a confirmation dialog when closing entire sessions (all panes in a workspace)"
          checked={confirmations.confirmSessionClose}
          onChange={(checked) => updateSetting('confirmSessionClose', checked)}
        />
      </SettingsSection>
    </div>
  )
}


const PluginManagerSettingsView = () => {
  const {
    installedPlugins,
    availablePlugins,
    updatesAvailable,
    activeTab,
    searchQuery,
    operation,
    setActiveTab,
    setSearchQuery,
    searchPlugins,
    installPlugin,
    uninstallPlugin,
    updatePlugin,
    checkForUpdates,
    refreshInstalledPlugins,
    clearError,
    isOperationInProgress
  } = usePluginManager()

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  useEffect(() => {
    checkForUpdates()
  }, [checkForUpdates])

  const handleInstall = (packageName: string) => {
    installPlugin(packageName)
  }

  const handleUninstall = (pluginId: string) => {
    const plugin = installedPlugins.find(p => p.id === pluginId)
    if (!plugin) return

    setConfirmDialog({
      open: true,
      title: 'Uninstall Plugin',
      message: `Are you sure you want to uninstall "${plugin.name}"? This action cannot be undone.`,
      onConfirm: () => {
        uninstallPlugin(pluginId)
        setConfirmDialog(prev => ({ ...prev, open: false }))
      }
    })
  }

  const handleUpdate = (pluginId: string, packageName: string) => {
    updatePlugin(pluginId, packageName)
  }

  const handleEnable = async (pluginId: string) => {
    try {
      await window.terminalApp.plugins.enable(pluginId)
      await refreshInstalledPlugins()
    } catch (error) {
      console.error('Failed to enable plugin:', error)
    }
  }

  const handleDisable = async (pluginId: string) => {
    try {
      await window.terminalApp.plugins.disable(pluginId)
      await refreshInstalledPlugins()
    } catch (error) {
      console.error('Failed to disable plugin:', error)
    }
  }

  const getPluginsForTab = () => {
    switch (activeTab) {
      case 'installed':
        return installedPlugins
      case 'available':
        return availablePlugins
      case 'updates':
        return updatesAvailable.map(update => {
          const plugin = installedPlugins.find(p => p.id === update.pluginId)
          return plugin ? {
            ...plugin,
            updateAvailable: true,
            latestVersion: update.latestVersion
          } : null
        }).filter(Boolean)
      default:
        return []
    }
  }

  const plugins = getPluginsForTab()
  const isLoading = isOperationInProgress()

  return (
    <>
      <div className="plugin-manager-settings plugin-manager-dialog__content">
        {operation.status !== 'idle' && (
          <div className="plugin-manager-dialog__status">
            <StatusBar operation={operation} onDismiss={clearError} />
          </div>
        )}

        <div className="plugin-manager-dialog__tabs">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            installedCount={installedPlugins.length}
            updatesCount={updatesAvailable.length}
            disabled={isLoading}
          />
        </div>

        {activeTab === 'available' && (
          <div className="plugin-manager-dialog__search">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={searchPlugins}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="plugin-manager-dialog__list" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {plugins.length === 0 ? (
            <div className="plugin-manager-dialog__empty">
              {activeTab === 'installed' && (
                <>
                  <span className="plugin-manager-dialog__empty-icon">📦</span>
                  <p className="plugin-manager-dialog__empty-text">No plugins installed yet</p>
                  <p className="plugin-manager-dialog__empty-hint">Browse available plugins to get started</p>
                </>
              )}
              {activeTab === 'available' && (
                <>
                  <p className="plugin-manager-dialog__empty-text">
                    {searchQuery ? 'No plugins found' : 'Search for plugins'}
                  </p>
                  <p className="plugin-manager-dialog__empty-hint">
                    Try searching for "sessionry-plugin" or specific functionality
                  </p>
                </>
              )}
              {activeTab === 'updates' && (
                <>
                  <p className="plugin-manager-dialog__empty-text">All plugins are up to date</p>
                </>
              )}
            </div>
          ) : (
            <div className="plugin-manager-dialog__cards">
              {plugins.map((plugin: any) => (
                <PluginCard
                  key={plugin.id || plugin.package?.name}
                  plugin={plugin}
                  variant={activeTab === 'updates' ? 'update' : activeTab}
                  onInstall={handleInstall}
                  onUninstall={handleUninstall}
                  onUpdate={handleUpdate}
                  onEnable={handleEnable}
                  onDisable={handleDisable}
                  disabled={isLoading}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        open={confirmDialog.open}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Uninstall"
        cancelLabel="Cancel"
        intent="danger"
      />
    </>
  )
}
