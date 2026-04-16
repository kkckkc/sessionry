import type { TerminalSessionState } from './terminal'

export type ToolbarActionId =
  | 'terminal:new'
  | 'terminal:clear'
  | 'layout:toggle-left'
  | 'layout:toggle-right'

export type SidebarSide = 'left' | 'right'

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
}

export interface AppPlugin {
  id: string
  name: string
  toolbar?: ToolbarActionContribution[]
  panels?: SidebarPanelContribution[]
  statusItems?: StatusItemContribution[]
  activateMain?: () => void
  activateRenderer?: () => void
}

export interface StatusSnapshot {
  state: TerminalSessionState
  shell: string
  cwd: string
}
