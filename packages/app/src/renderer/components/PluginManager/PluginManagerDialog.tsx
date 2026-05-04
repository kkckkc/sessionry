/**
 * Plugin Manager Dialog
 * 
 * Main container for the Plugin Manager UI.
 */

import React, { useEffect } from 'react'
import { Dialog, DialogHeader, ConfirmationDialog } from '@sessionry/components'
import { usePluginManager } from './PluginManagerContext'
import { SearchBar } from './SearchBar'
import { TabNavigation } from './TabNavigation'
import { PluginCard } from './PluginCard'
import { StatusBar } from './StatusBar'
import './PluginManagerDialog.css'

/**
 * Plugin Manager Dialog Props
 */
export interface PluginManagerDialogProps {
  open: boolean
  onClose: () => void
}

/**
 * Plugin Manager Dialog Component
 */
export function PluginManagerDialog({ open, onClose }: PluginManagerDialogProps) {
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

  const [confirmDialog, setConfirmDialog] = React.useState<{
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

  /**
   * Load data on mount
   */
  useEffect(() => {
    if (open) {
      refreshInstalledPlugins()
      checkForUpdates()
    }
  }, [open, refreshInstalledPlugins, checkForUpdates])

  /**
   * Handle install
   */
  const handleInstall = (packageName: string) => {
    installPlugin(packageName)
  }

  /**
   * Handle uninstall with confirmation
   */
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

  /**
   * Handle update
   */
  const handleUpdate = (pluginId: string, packageName: string) => {
    updatePlugin(pluginId, packageName)
  }

  /**
   * Handle enable/disable
   */
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

  /**
   * Get plugins for current tab
   */
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
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose()
        }}
        className="plugin-manager-dialog"
      >
        <DialogHeader title="Plugin Manager" showClose onClose={onClose} />
        <div className="plugin-manager-dialog__content">
          {/* Status Bar */}
          {operation.status !== 'idle' && (
            <div className="plugin-manager-dialog__status">
              <StatusBar operation={operation} onDismiss={clearError} />
            </div>
          )}

          {/* Tab Navigation */}
          <div className="plugin-manager-dialog__tabs">
            <TabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              installedCount={installedPlugins.length}
              updatesCount={updatesAvailable.length}
              disabled={isLoading}
            />
          </div>

          {/* Search Bar (only for Available tab) */}
          {activeTab === 'available' && (
            <div className="plugin-manager-dialog__search">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={searchPlugins}
                disabled={isLoading}
                autoFocus
              />
            </div>
          )}

          {/* Plugin List */}
          <div
            className="plugin-manager-dialog__list"
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            {plugins.length === 0 ? (
              <div className="plugin-manager-dialog__empty">
                {activeTab === 'installed' && (
                  <>
                    <span className="plugin-manager-dialog__empty-icon">📦</span>
                    <p className="plugin-manager-dialog__empty-text">
                      No plugins installed yet
                    </p>
                    <p className="plugin-manager-dialog__empty-hint">
                      Browse available plugins to get started
                    </p>
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
                    <p className="plugin-manager-dialog__empty-text">
                      All plugins are up to date
                    </p>
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
      </Dialog>

      {/* Confirmation Dialog */}
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
