/**
 * Tab Navigation Component
 * 
 * Tabs for switching between Installed, Available, and Updates views.
 */

import React from 'react'
import type { PluginTab } from './PluginManagerContext'
import './TabNavigation.css'

/**
 * Tab Navigation Props
 */
export interface TabNavigationProps {
  activeTab: PluginTab
  onTabChange: (tab: PluginTab) => void
  installedCount?: number
  updatesCount?: number
  disabled?: boolean
}

/**
 * Tab item configuration
 */
interface TabItem {
  id: PluginTab
  label: string
}

const tabs: TabItem[] = [
  { id: 'installed', label: 'Installed' },
  { id: 'available', label: 'Available' },
  { id: 'updates', label: 'Updates' }
]

/**
 * Tab Navigation Component
 */
export function TabNavigation({
  activeTab,
  onTabChange,
  installedCount,
  updatesCount,
  disabled = false
}: TabNavigationProps) {
  /**
   * Get count badge for tab
   */
  const getTabCount = (tabId: PluginTab): number | undefined => {
    switch (tabId) {
      case 'installed':
        return installedCount
      case 'updates':
        return updatesCount
      default:
        return undefined
    }
  }

  /**
   * Handle tab click
   */
  const handleTabClick = (tabId: PluginTab) => {
    if (!disabled && tabId !== activeTab) {
      onTabChange(tabId)
    }
  }

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent, tabId: PluginTab) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleTabClick(tabId)
    }
  }

  return (
    <div className="tab-navigation" role="tablist" aria-label="Plugin views">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        const count = getTabCount(tab.id)
        const showBadge = count !== undefined && count > 0

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`tab-navigation__tab ${
              isActive ? 'tab-navigation__tab--active' : ''
            }`}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            disabled={disabled}
            tabIndex={isActive ? 0 : -1}
          >
            <span className="tab-navigation__label">{tab.label}</span>
            {showBadge && (
              <span className="tab-navigation__badge" aria-label={`${count} items`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
