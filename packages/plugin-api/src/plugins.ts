import type { ComponentType } from 'react'

import type { ActionContribution, ActionDescriptor } from './actions'
import type { AppSettings } from './settings'
import type { Pane, WorkspaceApi } from './workspace'

export type SidebarSide = 'left' | 'right'
export type PluginViewSlotId = string;

export interface PluginViewDefinition {
  id: string
  slot: PluginViewSlotId
  title: string
  isDefault?: boolean
}

export interface PluginViewContribution extends PluginViewDefinition {
  pluginId: string
}

export interface ViewProps {
  plugins: PluginViewModel
  workspace: WorkspaceApi
  resolveRendererView: (viewId: string) => RendererViewRegistration | null
}

export interface SidebarViewProps extends ViewProps {}

export interface WorkspaceViewProps extends ViewProps {
  clearSignal: number
}

export interface StatusItemContribution {
  id: string
  label: string
  kind: 'session-state' | 'shell' | 'cwd' | 'connection'
}

export interface PluginViewModel {
  actions: ActionDescriptor[]
  toolbarActionIds: string[]
  statusItems: StatusItemContribution[]
  viewsBySlot: Record<string, PluginViewContribution[]>
}

export interface PaneViewProps extends ViewProps {
  pane: Pane
  clearSignal: number
  visible: boolean
}

export interface SettingsViewProps {
  pluginId: string
  settings: unknown
  onUpdate: (updates: unknown) => Promise<void>
}

export interface PluginSettingsViewDefinition {
  id: string
  title: string
  description?: string
  icon?: string
}

export interface RendererViewRegistration {
  component: ComponentType<any>
}

export interface AppPlugin {
  id: string
  name: string
  actions?: ActionContribution[]
  statusItems?: StatusItemContribution[]
  views?: PluginViewDefinition[]
  settingsView?: PluginSettingsViewDefinition
  activateMain?: (context: MainPluginContext) => void | Promise<void>
  activateRenderer?: (context: RendererPluginContext) => void | Promise<void>
}

export interface RendererPluginViewDefinition extends PluginViewDefinition, RendererViewRegistration {}

export interface RendererPluginSettingsViewDefinition extends PluginSettingsViewDefinition, RendererViewRegistration {}

export interface RendererAppPlugin extends Omit<AppPlugin, 'views' | 'settingsView'> {
  views?: RendererPluginViewDefinition[]
  settingsView?: RendererPluginSettingsViewDefinition
}


export interface PluginIpcApi {
  /** Register an invoke handler (renderer calls ipcRenderer.invoke). */
  handle: (channel: string, handler: (...args: unknown[]) => unknown) => void
  /** Register a one-way listener (renderer calls ipcRenderer.send). */
  on: (channel: string, handler: (...args: unknown[]) => void) => void
  /** Send an event to the renderer. */
  emit: (channel: string, ...args: unknown[]) => void
}

export interface MainPluginContext {
  workspace: WorkspaceApi
  ipc: PluginIpcApi
  settings: AppSettings
  onBeforeQuit: (handler: () => void) => void
}

export interface RendererPluginContext {
  workspace: WorkspaceApi
  settings: {
    read: () => AppSettings
    update: (updates: Partial<AppSettings>) => Promise<void>
    onChange: (listener: (settings: AppSettings) => void) => () => void
  }
}


