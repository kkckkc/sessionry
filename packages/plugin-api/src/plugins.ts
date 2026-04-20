import type { ComponentType } from 'react'

import type { ActionContribution, ActionDescriptor } from './actions'
import type { TerminalSessionInfo } from './terminal'
import type { Pane, PaneGroupChild, PaneGroupLayout, PaneType, WorkspaceApi, WorkspaceStateSnapshot } from './workspace'

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

export interface SidebarViewProps {
  plugins: PluginViewModel
  snapshot: WorkspaceStateSnapshot
  activeSessionId?: string
  onActivateSession: (sessionId: string) => void
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

export interface WorkspaceViewProps {
  plugins: PluginViewModel
  snapshot: WorkspaceStateSnapshot
  projectId?: string
  sessionId?: string
  resolveRendererView: (viewId: string) => RendererViewRegistration | null
  terminalSession: TerminalSessionInfo | null
  clearSignal: number
  activeTerminalPaneId: string | null
  onSelectStackedChild: (paneGroupId: string, childId: string) => void
  onResizePaneNodes: (updates: Array<{ kind: 'pane' | 'group'; id: string; preferredSizePct: number }>) => void
  onRemovePaneNode: (node: PaneGroupChild) => void
  onAddTerminalPane: (paneGroupId: string) => void
  onSplitPane: (paneId: string, direction: 'horizontal' | 'vertical') => void
  onRenameGroup: (paneGroupId: string, name: string) => void
  onChangeGroupType: (paneGroupId: string, direction: PaneGroupLayout) => void
}

export interface PaneViewProps {
  pane: Pane
  snapshot: WorkspaceStateSnapshot
  projectId?: string
  sessionId?: string
  terminalSession: TerminalSessionInfo | null
  clearSignal: number
  activeTerminalPaneId: string | null
  visible: boolean
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
  activateMain?: (context: MainPluginContext) => void | Promise<void>
  activateRenderer?: (context: RendererPluginContext) => void | Promise<void>
}

export interface RendererPluginViewDefinition extends PluginViewDefinition, RendererViewRegistration {}

export interface RendererAppPlugin extends Omit<AppPlugin, 'views'> {
  views?: RendererPluginViewDefinition[]
}


// REVIEW: Remove this
export const getPaneSlotId = (paneType: PaneType): PluginViewSlotId => `pane:${paneType}`

export interface MainPluginContext {
  workspace: WorkspaceApi
}

export interface RendererPluginContext {
  workspace: WorkspaceApi
}

// REVIEW: Remove this
export const getSidebarSlotId = (side: SidebarSide): PluginViewSlotId => `sidebar:${side}`
