import type { ComponentType } from 'react'

import type { TerminalSessionInfo, TerminalSessionState } from './terminal'
import type { WorkspaceApi, WorkspaceStateSnapshot } from './workspace'

export type ToolbarActionId =
  | 'terminal:new'
  | 'terminal:clear'
  | 'layout:toggle-left'
  | 'layout:toggle-right'

export type SidebarSide = 'left' | 'right'
export type PluginViewSlotId = 'workspace' | (string & {})

export interface PluginViewDefinition {
  id: string
  slot: PluginViewSlotId
  title: string
  isDefault?: boolean
}

export interface PluginViewContribution extends PluginViewDefinition {
  pluginId: string
}

export interface ToolbarActionContribution {
  id: ToolbarActionId
  label: string
  description: string
}

export interface SidebarPanelContribution {
  id: string
  title: string
  side: SidebarSide
  pluginId: string
}

export interface StatusItemContribution {
  id: string
  label: string
  kind: 'session-state' | 'shell' | 'cwd' | 'connection'
}

export interface PluginViewModel {
  toolbar: ToolbarActionContribution[]
  leftPanels: SidebarPanelContribution[]
  rightPanels: SidebarPanelContribution[]
  statusItems: StatusItemContribution[]
  viewsBySlot: Record<string, PluginViewContribution[]>
}

export interface WorkspaceViewProps {
  snapshot: WorkspaceStateSnapshot
  projectId?: string
  sessionId?: string
  terminalSession: TerminalSessionInfo | null
  clearSignal: number
  activeTerminalPaneId: string | null
  onSelectStackedChild: (paneGroupId: string, childId: string) => void
}

export interface RendererViewRegistration {
  component: ComponentType<WorkspaceViewProps>
}

export interface AppPlugin {
  id: string
  name: string
  toolbar?: ToolbarActionContribution[]
  panels?: SidebarPanelContribution[]
  statusItems?: StatusItemContribution[]
  views?: PluginViewDefinition[]
  activateMain?: (context: MainPluginContext) => void | Promise<void>
  activateRenderer?: (context: RendererPluginContext) => void | Promise<void>
}

export interface RendererPluginViewDefinition extends PluginViewDefinition, RendererViewRegistration {}

export interface RendererAppPlugin extends Omit<AppPlugin, 'views'> {
  views?: RendererPluginViewDefinition[]
}

export interface StatusSnapshot {
  state: TerminalSessionState
  shell: string
  cwd: string
}

export interface MainPluginContext {
  workspace: WorkspaceApi
}

export interface RendererPluginContext {
  workspace: WorkspaceApi
}
