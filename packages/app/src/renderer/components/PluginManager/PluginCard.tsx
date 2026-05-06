/**
 * Plugin Card Component
 *
 * Displays plugin information with actions (install, uninstall, update, enable/disable).
 */

import React from 'react';
import { Badge, Button } from '@sessionry/components';
import type { PluginState } from './PluginManagerContext';
import type { PluginSearchResult } from '../../../main/npm/pluginManagerService';
import './PluginCard.css';

/**
 * Plugin Card Props
 */
export interface PluginCardProps {
  plugin: PluginState | PluginSearchResult;
  variant: 'installed' | 'available' | 'update';
  onInstall?: (packageName: string) => void;
  onUninstall?: (pluginId: string) => void;
  onUpdate?: (pluginId: string, packageName: string) => void;
  onEnable?: (pluginId: string) => void;
  onDisable?: (pluginId: string) => void;
  disabled?: boolean;
}

/**
 * Check if plugin is installed
 */
function isInstalledPlugin(plugin: PluginState | PluginSearchResult): plugin is PluginState {
  return 'installed' in plugin && plugin.installed === true;
}

/**
 * Check if plugin is search result
 */
function isSearchResult(plugin: PluginState | PluginSearchResult): plugin is PluginSearchResult {
  return 'package' in plugin;
}

/**
 * Plugin Card Component
 */
export function PluginCard({
  plugin,
  variant,
  onInstall,
  onUninstall,
  onUpdate,
  onEnable,
  onDisable,
  disabled = false
}: PluginCardProps) {
  // Extract plugin info based on type
  const pluginInfo = isSearchResult(plugin)
    ? {
        id: plugin.package.name.replace(/[@/]/g, '-'),
        name: plugin.package.name,
        version: plugin.package.version,
        description: plugin.package.description,
        author:
          typeof plugin.package.author === 'string'
            ? plugin.package.author
            : plugin.package.author?.name,
        keywords: plugin.package.keywords,
        compatible: plugin.compatible,
        validationWarnings: plugin.validationWarnings,
        canDisable: true,
        canUninstall: true,
        source: undefined
      }
    : {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        keywords: plugin.keywords,
        enabled: plugin.enabled,
        updateAvailable: plugin.updateAvailable,
        latestVersion: plugin.latestVersion,
        // biome-ignore lint/suspicious/noExplicitAny: Plugin metadata may have additional properties from npm registry
        canDisable: (plugin as any).canDisable ?? true,
        // biome-ignore lint/suspicious/noExplicitAny: Plugin metadata may have additional properties from npm registry
        canUninstall: (plugin as any).canUninstall ?? true,
        // biome-ignore lint/suspicious/noExplicitAny: Plugin metadata may have additional properties from npm registry
        source: (plugin as any).source
      };

  const statusBadges: React.ReactNode[] = [];

  if (pluginInfo.source === 'builtin') {
    statusBadges.push(
      <Badge key="builtin" variant="accent">
        Built-in
      </Badge>
    );
  }

  if (variant === 'installed' && 'enabled' in pluginInfo) {
    statusBadges.push(
      <Badge key="enabled" variant={pluginInfo.enabled ? 'success' : 'default'}>
        {pluginInfo.enabled ? 'Enabled' : 'Disabled'}
      </Badge>
    );
  }

  /**
   * Handle install click
   */
  const handleInstall = () => {
    if (onInstall && isSearchResult(plugin)) {
      onInstall(plugin.package.name);
    }
  };

  /**
   * Handle uninstall click
   */
  const handleUninstall = () => {
    if (onUninstall && isInstalledPlugin(plugin)) {
      onUninstall(plugin.id);
    }
  };

  /**
   * Handle update click
   */
  const handleUpdate = () => {
    if (onUpdate && isInstalledPlugin(plugin)) {
      onUpdate(plugin.id, plugin.name);
    }
  };

  /**
   * Handle enable/disable toggle
   */
  const handleToggleEnabled = () => {
    if (isInstalledPlugin(plugin)) {
      if (plugin.enabled && onDisable) {
        onDisable(plugin.id);
      } else if (!plugin.enabled && onEnable) {
        onEnable(plugin.id);
      }
    }
  };

  return (
    <div className={`plugin-card plugin-card--${variant}`} data-plugin-id={pluginInfo.id}>
      <div className="plugin-card__header">
        <div className="plugin-card__info">
          <div className="plugin-card__title-row">
            <h3 className="plugin-card__name">{pluginInfo.name}</h3>
            <span className="plugin-card__version">v{pluginInfo.version}</span>
          </div>

          {statusBadges.length > 0 && <div className="plugin-card__status-row">{statusBadges}</div>}

          {/* Show update badge if available */}
          {variant === 'installed' && pluginInfo.updateAvailable && (
            <span className="plugin-card__badge plugin-card__badge--update">
              Update available: v{pluginInfo.latestVersion}
            </span>
          )}

          {/* Show compatibility badge for search results */}
          {variant === 'available' && pluginInfo.compatible !== undefined && (
            <span
              className={`plugin-card__badge plugin-card__badge--${
                pluginInfo.compatible ? 'compatible' : 'incompatible'
              }`}
            >
              {pluginInfo.compatible ? 'Compatible' : 'Incompatible'}
            </span>
          )}
        </div>

        <div className="plugin-card__actions">
          {/* Install button for available plugins */}
          {variant === 'available' && (
            <Button
              onClick={handleInstall}
              disabled={disabled || pluginInfo.compatible === false}
              size="small"
            >
              Install
            </Button>
          )}

          {/* Update button for plugins with updates */}
          {variant === 'update' && (
            <Button onClick={handleUpdate} disabled={disabled} size="small" variant="primary">
              Update
            </Button>
          )}

          {/* Enable/Disable toggle for installed plugins */}
          {variant === 'installed' && 'enabled' in pluginInfo && (
            <Button
              onClick={handleToggleEnabled}
              disabled={disabled || !pluginInfo.canDisable}
              size="small"
              variant="secondary"
              title={!pluginInfo.canDisable ? 'Built-in plugins cannot be disabled' : undefined}
            >
              {pluginInfo.enabled ? 'Disable' : 'Enable'}
            </Button>
          )}

          {/* Uninstall button for installed plugins */}
          {variant === 'installed' && (
            <Button
              onClick={handleUninstall}
              disabled={disabled || !pluginInfo.canUninstall}
              size="small"
              variant="danger"
              title={
                !pluginInfo.canUninstall ? 'Built-in plugins cannot be uninstalled' : undefined
              }
            >
              Uninstall
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {pluginInfo.description && (
        <p className="plugin-card__description">{pluginInfo.description}</p>
      )}

      {/* Author */}
      {pluginInfo.author && (
        <div className="plugin-card__meta">
          <span className="plugin-card__author">By {pluginInfo.author}</span>
        </div>
      )}

      {/* Keywords */}
      {pluginInfo.keywords && pluginInfo.keywords.length > 0 && (
        <div className="plugin-card__keywords">
          {pluginInfo.keywords.slice(0, 5).map(keyword => (
            <span key={keyword} className="plugin-card__keyword">
              {keyword}
            </span>
          ))}
        </div>
      )}

      {/* Validation warnings for search results */}
      {variant === 'available' &&
        pluginInfo.validationWarnings &&
        pluginInfo.validationWarnings.length > 0 && (
          <div className="plugin-card__warnings">
            {pluginInfo.validationWarnings.map((warning, index) => (
              <div key={index} className="plugin-card__warning">
                ⚠️ {warning}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
