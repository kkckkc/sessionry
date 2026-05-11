import type { ComponentType, ReactNode } from 'react';

import type { ActionContribution, ActionDescriptor } from './actions';
import type { AppSettings } from './settings';
import type { ThemeDefinition } from './themes';
import type { VcsRegistryApi } from './vcs';
import type { Pane, WorkspaceApi } from './workspace';

export type SidebarSide = 'left' | 'right';
export type PluginViewSlotId = string;
export type PluginViewMode = 'single-view' | 'multi-view';

export interface PluginViewDefinition {
  id: string;
  slot: PluginViewSlotId;
  title: string;
  icon?: string;
  isDefault?: boolean;
}

export interface PluginViewContribution extends PluginViewDefinition {
  pluginId: string;
  viewMode: PluginViewMode;
  pluginIcon?: string;
}

export interface ViewProps {
  plugins: PluginViewModel;
  workspace: WorkspaceApi;
  resolveRendererView: (viewId: string) => RendererViewRegistration | null;
}

export interface SidebarViewProps extends ViewProps {}

export interface WorkspaceViewProps extends ViewProps {
  clearSignal: number;
}

export interface MultiViewProps extends ViewProps {
  slot: PluginViewSlotId;
  childViews: PluginViewContribution[];
  selectedViewId?: string;
  preferredViewId?: string;
}

export interface StatusItemContribution {
  id: string;
  label: string;
  kind: 'session-state' | 'shell' | 'cwd' | 'connection';
}

export interface PluginViewModel {
  actions: ActionDescriptor[];
  toolbarActionIds: string[];
  statusItems: StatusItemContribution[];
  viewsBySlot: Record<string, PluginViewContribution[]>;
}

export interface PaneAction {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface PaneViewProps extends ViewProps {
  pane: Pane;
  clearSignal: number;
  visible: boolean;
  /**
   * Optional callback to register a focus handler for this pane.
   * The pane view should call this with a function that focuses the pane content.
   */
  onRegisterFocusHandler?: (focusHandler: () => void) => void;
  /**
   * Optional callback to register custom actions for the pane title bar.
   * The pane view should call this with an array of actions to display.
   */
  onRegisterPaneActions?: (actions: PaneAction[]) => void;
}

export interface SettingsViewProps {
  pluginId: string;
  settings: unknown;
  onUpdate: (updates: unknown) => Promise<void>;
}

export interface PluginSettingsViewDefinition {
  id: string;
  title: string;
  description?: string;
  icon?: string;
}

export interface RendererViewRegistration {
  // biome-ignore lint/suspicious/noExplicitAny: Component props are plugin-specific and dynamically typed
  component: ComponentType<any>;
}

export interface AppPlugin {
  id: string;
  name: string;
  icon?: string;
  viewMode?: PluginViewMode;
  actions?: ActionContribution[];
  statusItems?: StatusItemContribution[];
  views?: PluginViewDefinition[];
  settingsView?: PluginSettingsViewDefinition;
  themes?: ThemeDefinition[];
  /** When true, this plugin requires direct IPC access between renderer and main process. */
  unsafeIpc?: boolean;
  activateMain?: (context: MainPluginContext) => void | Promise<void>;
  activateRenderer?: (context: RendererPluginContext) => void | Promise<void>;
}

export interface RendererPluginViewDefinition
  extends PluginViewDefinition,
    RendererViewRegistration {}

export interface RendererPluginSettingsViewDefinition
  extends PluginSettingsViewDefinition,
    RendererViewRegistration {}

export interface RendererAppPlugin extends Omit<AppPlugin, 'views' | 'settingsView'> {
  views?: RendererPluginViewDefinition[];
  settingsView?: RendererPluginSettingsViewDefinition;
}

export interface PluginIpcApi {
  /** Register an invoke handler (renderer calls ipcRenderer.invoke). */
  handle: (channel: string, handler: (...args: unknown[]) => unknown) => void;
  /** Register a one-way listener (renderer calls ipcRenderer.send). */
  on: (channel: string, handler: (...args: unknown[]) => void) => void;
  /** Send an event to the renderer. */
  emit: (channel: string, ...args: unknown[]) => void;
}

export interface MainPluginContext {
  workspace: WorkspaceApi;
  ipc: PluginIpcApi;
  vcs: VcsRegistryApi;
  settings: AppSettings;
  onBeforeQuit: (handler: () => void) => void;
}

export interface RendererPluginContext {
  workspace: WorkspaceApi;
  settings: {
    read: () => AppSettings;
    update: (updates: Partial<AppSettings>) => Promise<void>;
    onChange: (listener: (settings: AppSettings) => void) => () => void;
  };
}
