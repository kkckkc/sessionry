import type { SidebarPanelContribution, StatusItemContribution, ToolbarActionContribution } from '@shared/plugins'
import type { TerminalSessionInfo } from '@shared/terminal'

export const panelDescriptions: Record<string, string[]> = {
  'navigation.panel': ['Project tree placeholder', 'Workspace actions', 'Pinned commands'],
  'inspector.panel': ['Session details', 'Plugin diagnostics', 'Context-aware tools']
}

export const resolveStatusValue = (
  item: StatusItemContribution,
  session: TerminalSessionInfo | null
): string => {
  if (!session) return 'Waiting'

  switch (item.kind) {
    case 'session-state':
      return session.state
    case 'shell':
      return session.shell
    case 'cwd':
      return session.cwd
    case 'connection':
      return session.state === 'ready' ? 'attached' : 'offline'
    default:
      return 'n/a'
  }
}

export const sidebarItemCount = (panel: SidebarPanelContribution): number =>
  panelDescriptions[panel.id]?.length ?? 0

export const toolbarActionClassName = (action: ToolbarActionContribution): string => `action-${action.id}`
