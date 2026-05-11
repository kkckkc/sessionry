/**
 * Plugin Card Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PluginCard } from './PluginCard';
import type { PluginState } from './PluginManagerContext';
import type { PluginSearchResult } from '../../../main/npm/pluginManagerService';

describe('PluginCard', () => {
  describe('Installed Plugin', () => {
    const installedPlugin: PluginState = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Test Author',
      keywords: ['test', 'plugin'],
      installed: true,
      enabled: true
    };

    it('renders installed plugin information', () => {
      render(<PluginCard plugin={installedPlugin} variant="installed" />);

      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      expect(screen.getByText('A test plugin')).toBeInTheDocument();
      expect(screen.getByText('By Test Author')).toBeInTheDocument();
    });

    it('shows enabled badge for enabled plugin', () => {
      render(<PluginCard plugin={installedPlugin} variant="installed" />);

      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });

    it('renders built-in and enabled badges on the row below the plugin name', () => {
      const builtInPlugin = { ...installedPlugin, source: 'builtin' as const };

      render(<PluginCard plugin={builtInPlugin} variant="installed" />);

      const titleRow = screen.getByText('Test Plugin').closest('.plugin-card__title-row');
      const statusRow = screen.getByText('Built-in').closest('.plugin-card__status-row');

      expect(titleRow).toBeInTheDocument();
      expect(statusRow).toBeInTheDocument();
      expect(statusRow).toContainElement(screen.getByText('Enabled'));
      expect(titleRow?.nextElementSibling).toBe(statusRow);
    });

    it('shows disabled badge for disabled plugin', () => {
      const disabledPlugin = { ...installedPlugin, enabled: false };

      render(<PluginCard plugin={disabledPlugin} variant="installed" />);

      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('shows blocked IPC state and calls approval handler', () => {
      const unsafePlugin = { ...installedPlugin, unsafeIpc: true, ipcApproved: false };
      const onApproveIpc = vi.fn();

      render(
        <PluginCard
          plugin={unsafePlugin}
          variant="installed"
          onApproveIpc={onApproveIpc}
        />
      );

      expect(screen.getByText('IPC blocked')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Approve IPC'));
      expect(onApproveIpc).toHaveBeenCalledWith('test-plugin');
    });

    it('shows approved IPC state and calls revoke handler', () => {
      const unsafePlugin = { ...installedPlugin, unsafeIpc: true, ipcApproved: true };
      const onRevokeIpc = vi.fn();

      render(
        <PluginCard plugin={unsafePlugin} variant="installed" onRevokeIpc={onRevokeIpc} />
      );

      expect(screen.getByText('IPC approved')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Revoke IPC'));
      expect(onRevokeIpc).toHaveBeenCalledWith('test-plugin');
    });

    it('calls onDisable when disable button is clicked', () => {
      const onDisable = vi.fn();

      render(<PluginCard plugin={installedPlugin} variant="installed" onDisable={onDisable} />);

      fireEvent.click(screen.getByText('Disable'));
      expect(onDisable).toHaveBeenCalledWith('test-plugin');
    });

    it('calls onEnable when enable button is clicked', () => {
      const disabledPlugin = { ...installedPlugin, enabled: false };
      const onEnable = vi.fn();

      render(<PluginCard plugin={disabledPlugin} variant="installed" onEnable={onEnable} />);

      fireEvent.click(screen.getByText('Enable'));
      expect(onEnable).toHaveBeenCalledWith('test-plugin');
    });

    it('calls onUninstall when uninstall button is clicked', () => {
      const onUninstall = vi.fn();

      render(<PluginCard plugin={installedPlugin} variant="installed" onUninstall={onUninstall} />);

      fireEvent.click(screen.getByText('Uninstall'));
      expect(onUninstall).toHaveBeenCalledWith('test-plugin');
    });

    it('shows update badge when update is available', () => {
      const pluginWithUpdate = {
        ...installedPlugin,
        updateAvailable: true,
        latestVersion: '2.0.0'
      };

      render(<PluginCard plugin={pluginWithUpdate} variant="installed" />);

      expect(screen.getByText('Update available: v2.0.0')).toBeInTheDocument();
    });

    it('disables buttons when disabled prop is true', () => {
      render(<PluginCard plugin={installedPlugin} variant="installed" disabled={true} />);

      expect(screen.getByText('Disable')).toBeDisabled();
      expect(screen.getByText('Uninstall')).toBeDisabled();
    });

    it('renders keywords', () => {
      render(<PluginCard plugin={installedPlugin} variant="installed" />);

      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('plugin')).toBeInTheDocument();
    });
  });

  describe('Available Plugin', () => {
    const availablePlugin: PluginSearchResult = {
      package: {
        name: '@sessionry/test-plugin',
        version: '1.0.0',
        description: 'A test plugin from NPM',
        author: { name: 'NPM Author' },
        keywords: ['sessionry', 'test'],
        date: '2026-01-01T00:00:00.000Z'
      },
      score: {
        final: 1,
        detail: {
          quality: 1,
          popularity: 1,
          maintenance: 1
        }
      },
      searchScore: 1,
      compatible: true,
      validationWarnings: []
    };

    it('renders available plugin information', () => {
      render(<PluginCard plugin={availablePlugin} variant="available" />);

      expect(screen.getByText('@sessionry/test-plugin')).toBeInTheDocument();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      expect(screen.getByText('A test plugin from NPM')).toBeInTheDocument();
      expect(screen.getByText('By NPM Author')).toBeInTheDocument();
    });

    it('shows compatible badge', () => {
      render(<PluginCard plugin={availablePlugin} variant="available" />);

      expect(screen.getByText('Compatible')).toBeInTheDocument();
    });

    it('shows incompatible badge for incompatible plugin', () => {
      const incompatiblePlugin = { ...availablePlugin, compatible: false };

      render(<PluginCard plugin={incompatiblePlugin} variant="available" />);

      expect(screen.getByText('Incompatible')).toBeInTheDocument();
    });

    it('calls onInstall when install button is clicked', () => {
      const onInstall = vi.fn();

      render(<PluginCard plugin={availablePlugin} variant="available" onInstall={onInstall} />);

      fireEvent.click(screen.getByText('Install'));
      expect(onInstall).toHaveBeenCalledWith('@sessionry/test-plugin');
    });

    it('disables install button for incompatible plugin', () => {
      const incompatiblePlugin = { ...availablePlugin, compatible: false };

      render(<PluginCard plugin={incompatiblePlugin} variant="available" />);

      expect(screen.getByText('Install')).toBeDisabled();
    });

    it('shows validation warnings', () => {
      const pluginWithWarnings = {
        ...availablePlugin,
        validationWarnings: ['Missing required field', 'Invalid version']
      };

      render(<PluginCard plugin={pluginWithWarnings} variant="available" />);

      expect(screen.getByText('⚠️ Missing required field')).toBeInTheDocument();
      expect(screen.getByText('⚠️ Invalid version')).toBeInTheDocument();
    });
  });

  describe('Update Plugin', () => {
    const updatePlugin: PluginState = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      installed: true,
      enabled: true,
      updateAvailable: true,
      latestVersion: '2.0.0'
    };

    it('renders update plugin information', () => {
      render(<PluginCard plugin={updatePlugin} variant="update" />);

      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });

    it('calls onUpdate when update button is clicked', () => {
      const onUpdate = vi.fn();

      render(<PluginCard plugin={updatePlugin} variant="update" onUpdate={onUpdate} />);

      fireEvent.click(screen.getByText('Update'));
      expect(onUpdate).toHaveBeenCalledWith('test-plugin', 'Test Plugin');
    });
  });
});
