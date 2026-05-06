/**
 * Plugin Manager Components
 *
 * Export all Plugin Manager UI components and utilities.
 */

export { PluginManagerProvider, usePluginManager } from './PluginManagerContext';
export type {
  PluginManagerState,
  PluginState,
  OperationStatus,
  OperationProgress,
  PluginTab
} from './PluginManagerContext';

export { PluginManagerDialog } from './PluginManagerDialog';
export type { PluginManagerDialogProps } from './PluginManagerDialog';

export { PluginCard } from './PluginCard';
export type { PluginCardProps } from './PluginCard';

export { SearchBar } from './SearchBar';
export type { SearchBarProps } from './SearchBar';

export { TabNavigation } from './TabNavigation';
export type { TabNavigationProps } from './TabNavigation';

export { StatusBar } from './StatusBar';
export type { StatusBarProps } from './StatusBar';
