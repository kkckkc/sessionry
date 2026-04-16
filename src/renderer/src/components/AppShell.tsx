import { Toolbar } from '@base-ui-components/react/toolbar'

import type { PluginViewModel, SidebarPanelContribution, ToolbarActionContribution } from '@shared/plugins'
import type { TerminalSessionInfo } from '@shared/terminal'

import { panelDescriptions, resolveStatusValue, sidebarItemCount } from '../lib/pluginPanels'
import { TerminalView } from './TerminalView'

interface AppShellProps {
  plugins: PluginViewModel
  session: TerminalSessionInfo | null
  clearSignal: number
  leftVisible: boolean
  rightVisible: boolean
  onToolbarAction: (action: ToolbarActionContribution['id']) => void
}

const SidebarPanel = ({ panel }: { panel: SidebarPanelContribution }) => {
  const entries = panelDescriptions[panel.id] ?? ['No content registered']

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
  clearSignal,
  leftVisible,
  rightVisible,
  onToolbarAction
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
            <SidebarPanel key={panel.id} panel={panel} />
          ))}
        </aside>
      ) : null}

      <section className="terminal-pane">
        <div className="terminal-pane__header">
          <div>
            <span className="terminal-pane__label">Session</span>
            <strong>{session?.id ?? 'loading'}</strong>
          </div>
          <div>
            <span className="terminal-pane__label">PID</span>
            <strong>{session?.pid ?? 'pending'}</strong>
          </div>
        </div>
        <TerminalView session={session} clearSignal={clearSignal} />
      </section>

      {rightVisible ? (
        <aside className="sidebar sidebar--right">
          {plugins.rightPanels.map((panel) => (
            <SidebarPanel key={panel.id} panel={panel} />
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
