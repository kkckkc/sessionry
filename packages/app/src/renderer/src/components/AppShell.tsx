import type { ReactNode } from 'react'

import { Toolbar } from '@base-ui-components/react/toolbar'

import type {
  PluginViewModel,
  SidebarPanelViewProps,
  ToolbarActionContribution
} from '@sessionry/plugin-api'
import type { TerminalSessionInfo } from '@sessionry/plugin-api'
import { getSidebarSlotId } from '@sessionry/plugin-api'
import { resolveActiveView } from '@sessionry/plugin-api'
import type { RendererViewRegistration, WorkspaceStateSnapshot } from '@sessionry/plugin-api'

import { panelDescriptions, resolveStatusValue, sidebarItemCount } from '../lib/pluginPanels'

interface AppShellProps {
  plugins: PluginViewModel
  session: TerminalSessionInfo | null
  snapshot: WorkspaceStateSnapshot
  activeSessionId?: string
  leftVisible: boolean
  rightVisible: boolean
  mainContent: ReactNode
  onToolbarAction: (action: ToolbarActionContribution['id']) => void
  onActivateSession: (sessionId: string) => void
  resolveRendererView: (viewId: string) => RendererViewRegistration | null
}

const SidebarPanel = ({
  panel,
  plugins,
  snapshot,
  activeSessionId,
  onActivateSession,
  resolveRendererView
}: SidebarPanelViewProps & { resolveRendererView: (viewId: string) => RendererViewRegistration | null }) => {
  const slotId = getSidebarSlotId(panel.side)
  const activeView = resolveActiveView(plugins, slotId)
  const registration = activeView ? resolveRendererView(activeView.id) : null
  const entries = panelDescriptions[panel.id] ?? ['No content registered']

  if (registration) {
    const Component = registration.component
    return (
      <section className="sidebar-panel" aria-label={panel.title}>
        <header className="sidebar-panel__header">
          <span>{panel.title}</span>
          <span className="sidebar-panel__badge">{sidebarItemCount(panel)}</span>
        </header>
        <Component
          panel={panel}
          plugins={plugins}
          snapshot={snapshot}
          activeSessionId={activeSessionId}
          onActivateSession={onActivateSession}
        />
      </section>
    )
  }

  return (
    <section className="sidebar-panel" aria-label={panel.title}>
      <header className="sidebar-panel__header">
        <span>{panel.title}</span>
        <span className="sidebar-panel__badge">{sidebarItemCount(panel)}</span>
      </header>
      <ul className="sidebar-panel__list">
        {entries.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </section>
  )
}

export const AppShell = ({
  plugins,
  session,
  snapshot,
  activeSessionId,
  leftVisible,
  rightVisible,
  mainContent,
  onToolbarAction,
  onActivateSession,
  resolveRendererView
}: AppShellProps) => {
  const workspaceClassName = [
    'workspace',
    leftVisible ? 'workspace--left-visible' : 'workspace--left-hidden',
    rightVisible ? 'workspace--right-visible' : 'workspace--right-hidden'
  ].join(' ')

  return (
  <div className="app-frame">
    <header className="toolbar">
      <div className="toolbar__brand">
        <span className="toolbar__eyebrow">AI Term</span>
        <h1>Workspace</h1>
      </div>
      <Toolbar.Root className="toolbar__actions" aria-label="Terminal actions">
        {plugins.toolbar.map((action) => (
          <Toolbar.Button key={action.id} className="toolbar__button" onClick={() => onToolbarAction(action.id)}>
            {action.label}
          </Toolbar.Button>
        ))}
      </Toolbar.Root>
    </header>

    <main className={workspaceClassName}>
      {leftVisible ? (
        <aside className="sidebar sidebar--left">
          {plugins.leftPanels.map((panel) => (
            <SidebarPanel
              key={panel.id}
              panel={panel}
              plugins={plugins}
              snapshot={snapshot}
              activeSessionId={activeSessionId}
              onActivateSession={onActivateSession}
              resolveRendererView={resolveRendererView}
            />
          ))}
        </aside>
      ) : null}

      <section className="workspace-content">{mainContent}</section>

      {rightVisible ? (
        <aside className="sidebar sidebar--right">
          {plugins.rightPanels.map((panel) => (
            <SidebarPanel
              key={panel.id}
              panel={panel}
              plugins={plugins}
              snapshot={snapshot}
              activeSessionId={activeSessionId}
              onActivateSession={onActivateSession}
              resolveRendererView={resolveRendererView}
            />
          ))}
        </aside>
      ) : null}
    </main>

    <footer className="status-bar">
      {plugins.statusItems.map((item) => (
        <div key={item.id} className="status-bar__item">
          <span>{item.label}</span>
          <strong>{resolveStatusValue(item, session)}</strong>
        </div>
      ))}
    </footer>
  </div>
  )
}
