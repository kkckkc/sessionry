/**
 * Plugin Manager Context
 * 
 * Provides state management for the Plugin Manager UI using React Context API.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { 
  PluginSearchResult,
  PluginUpdateInfo
} from '../../../main/npm/pluginManagerService'

/**
 * Plugin state for UI
 */
export interface PluginState {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  keywords?: string[]
  installed: boolean
  enabled: boolean
  updateAvailable?: boolean
  latestVersion?: string
}

/**
 * Operation status
 */
export type OperationStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Operation progress
 */
export interface OperationProgress {
  operation: 'search' | 'install' | 'uninstall' | 'update'
  pluginId?: string
  status: OperationStatus
  progress?: number // 0-100
  message?: string
  error?: string
}

/**
 * Active tab
 */
export type PluginTab = 'installed' | 'available' | 'updates'

/**
 * Plugin Manager Context State
 */
export interface PluginManagerState {
  // Plugins
  installedPlugins: PluginState[]
  availablePlugins: PluginSearchResult[]
  updatesAvailable: PluginUpdateInfo[]
  
  // UI State
  activeTab: PluginTab
  searchQuery: string
  selectedPlugin: PluginState | null
  
  // Operation State
  operation: OperationProgress
  
  // Actions
  setActiveTab: (tab: PluginTab) => void
  setSearchQuery: (query: string) => void
  setSelectedPlugin: (plugin: PluginState | null) => void
  
  // Operations
  searchPlugins: (query: string) => Promise<void>
  installPlugin: (packageName: string, version?: string) => Promise<void>
  uninstallPlugin: (pluginId: string) => Promise<void>
  updatePlugin: (pluginId: string, packageName: string) => Promise<void>
  checkForUpdates: () => Promise<void>
  refreshInstalledPlugins: () => Promise<void>
  
  // Helpers
  clearError: () => void
  isOperationInProgress: () => boolean
}

/**
 * Context
 */
const PluginManagerContext = createContext<PluginManagerState | undefined>(undefined)

/**
 * Provider Props
 */
export interface PluginManagerProviderProps {
  children: React.ReactNode
}

/**
 * Plugin Manager Provider
 */
export function PluginManagerProvider({ children }: PluginManagerProviderProps) {
  // State
  const [installedPlugins, setInstalledPlugins] = useState<PluginState[]>([])
  const [availablePlugins, setAvailablePlugins] = useState<PluginSearchResult[]>([])
  const [updatesAvailable, setUpdatesAvailable] = useState<PluginUpdateInfo[]>([])
  
  const [activeTab, setActiveTab] = useState<PluginTab>('installed')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlugin, setSelectedPlugin] = useState<PluginState | null>(null)
  
  const [operation, setOperation] = useState<OperationProgress>({
    operation: 'search',
    status: 'idle'
  })

  /**
   * Load installed plugins on mount
   */
  useEffect(() => {
    refreshInstalledPlugins()
  }, [])

  /**
   * Search for plugins
   */
  const searchPlugins = useCallback(async (query: string) => {
    if (!query.trim()) {
      setAvailablePlugins([])
      return
    }

    setOperation({
      operation: 'search',
      status: 'loading',
      message: 'Searching plugins...'
    })

    try {
      // Call IPC to search plugins
      const results = await window.terminalApp.plugins.search(query, { size: 20 })

      setAvailablePlugins(results)
      setOperation({
        operation: 'search',
        status: 'success',
        message: `Found ${results.length} plugins`
      })
    } catch (error) {
      setOperation({
        operation: 'search',
        status: 'error',
        error: error instanceof Error ? error.message : 'Search failed'
      })
    }
  }, [])

  /**
   * Install a plugin
   */
  const installPlugin = useCallback(async (packageName: string, version?: string) => {
    setOperation({
      operation: 'install',
      pluginId: packageName,
      status: 'loading',
      progress: 0,
      message: 'Installing plugin...'
    })

    try {
      // Set up progress listener
      const progressHandler = (data: { downloaded: number; total: number }) => {
        const progress = Math.round((data.downloaded / data.total) * 100)
        setOperation(prev => ({
          ...prev,
          progress,
          message: `Downloading... ${progress}%`
        }))
      }

      const unsubscribe = window.terminalApp.plugins.onInstallProgress(progressHandler)

      // Call IPC to install plugin
      const result = await window.terminalApp.plugins.install(packageName, version)

      // Clean up listener
      unsubscribe()

      if (result.success) {
        setOperation({
          operation: 'install',
          pluginId: result.pluginId,
          status: 'success',
          progress: 100,
          message: 'Plugin installed successfully'
        })

        // Refresh installed plugins
        await refreshInstalledPlugins()
      } else {
        throw new Error(result.error || 'Installation failed')
      }
    } catch (error) {
      setOperation({
        operation: 'install',
        pluginId: packageName,
        status: 'error',
        error: error instanceof Error ? error.message : 'Installation failed'
      })
    }
  }, [])

  /**
   * Uninstall a plugin
   */
  const uninstallPlugin = useCallback(async (pluginId: string) => {
    setOperation({
      operation: 'uninstall',
      pluginId,
      status: 'loading',
      message: 'Uninstalling plugin...'
    })

    try {
      const success = await window.terminalApp.plugins.uninstall(pluginId)

      if (success) {
        setOperation({
          operation: 'uninstall',
          pluginId,
          status: 'success',
          message: 'Plugin uninstalled successfully'
        })

        // Refresh installed plugins
        await refreshInstalledPlugins()
      } else {
        throw new Error('Plugin not found')
      }
    } catch (error) {
      setOperation({
        operation: 'uninstall',
        pluginId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Uninstallation failed'
      })
    }
  }, [])

  /**
   * Update a plugin
   */
  const updatePlugin = useCallback(async (pluginId: string, packageName: string) => {
    setOperation({
      operation: 'update',
      pluginId,
      status: 'loading',
      progress: 0,
      message: 'Updating plugin...'
    })

    try {
      // Set up progress listener
      const progressHandler = (data: { downloaded: number; total: number }) => {
        const progress = Math.round((data.downloaded / data.total) * 100)
        setOperation(prev => ({
          ...prev,
          progress,
          message: `Downloading update... ${progress}%`
        }))
      }

      const unsubscribe = window.terminalApp.plugins.onUpdateProgress(progressHandler)

      // Call IPC to update plugin
      const result = await window.terminalApp.plugins.update(pluginId, packageName)

      // Clean up listener
      unsubscribe()

      if (result.success) {
        setOperation({
          operation: 'update',
          pluginId: result.pluginId,
          status: 'success',
          progress: 100,
          message: 'Plugin updated successfully'
        })

        // Refresh installed plugins and updates
        await refreshInstalledPlugins()
        await checkForUpdates()
      } else {
        throw new Error(result.error || 'Update failed')
      }
    } catch (error) {
      setOperation({
        operation: 'update',
        pluginId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Update failed'
      })
    }
  }, [])

  /**
   * Check for plugin updates
   */
  const checkForUpdates = useCallback(async () => {
    try {
      const updates = await window.terminalApp.plugins.checkUpdates()
      setUpdatesAvailable(updates.filter((u: PluginUpdateInfo) => u.updateAvailable))
    } catch (error) {
      console.error('Failed to check for updates:', error)
    }
  }, [])

  /**
   * Refresh installed plugins list
   */
  const refreshInstalledPlugins = useCallback(async () => {
    try {
      const plugins = await window.terminalApp.plugins.list()
      setInstalledPlugins(plugins)
    } catch (error) {
      console.error('Failed to load installed plugins:', error)
    }
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setOperation(prev => ({
      ...prev,
      status: 'idle',
      error: undefined
    }))
  }, [])

  /**
   * Check if operation is in progress
   */
  const isOperationInProgress = useCallback(() => {
    return operation.status === 'loading'
  }, [operation.status])

  const value: PluginManagerState = {
    // Plugins
    installedPlugins,
    availablePlugins,
    updatesAvailable,
    
    // UI State
    activeTab,
    searchQuery,
    selectedPlugin,
    
    // Operation State
    operation,
    
    // Actions
    setActiveTab,
    setSearchQuery,
    setSelectedPlugin,
    
    // Operations
    searchPlugins,
    installPlugin,
    uninstallPlugin,
    updatePlugin,
    checkForUpdates,
    refreshInstalledPlugins,
    
    // Helpers
    clearError,
    isOperationInProgress
  }

  return (
    <PluginManagerContext.Provider value={value}>
      {children}
    </PluginManagerContext.Provider>
  )
}

/**
 * Hook to use Plugin Manager context
 */
export function usePluginManager(): PluginManagerState {
  const context = useContext(PluginManagerContext)
  
  if (!context) {
    throw new Error('usePluginManager must be used within PluginManagerProvider')
  }
  
  return context
}
