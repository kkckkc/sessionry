import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import * as TbIcons from 'react-icons/tb'

import { Toolbar } from '@base-ui-components/react/toolbar'

import type { ActionDescriptor, PluginViewModel, SidebarViewProps } from '@sessionry/plugin-api'
import type { TerminalSessionInfo } from '@sessionry/plugin-api'
import { getSidebarSlotId } from '@sessionry/plugin-api'
import { resolveActiveView } from '@sessionry/plugin-api'
import type { RendererViewRegistration, WorkspaceStateSnapshot } from '@sessionry/plugin-api'

import { resolveStatusValue } from '../lib/pluginPanels'

interface AppShellProps {
  plugins: PluginViewModel
  session: TerminalSessionInfo | null
  snapshot: WorkspaceStateSnapshot
  activeSessionId?: string
  leftVisible: boolean
  rightVisible: boolean
  mainContent: ReactNode
  dialog?: ReactNode
  onToolbarAction: (actionId: string) => void
  onActivateSession: (sessionId: string) => void
  resolveRendererView: (viewId: string) => RendererViewRegistration | null
}

const resolveTablerIcon = (name: string): IconType | null => {
  const icon = TbIcons[name as keyof typeof TbIcons]
  return icon ? (icon as IconType) : null
}

const resolveSidebarRegistration = ({
  side,
  plugins,
  resolveRendererView
}: {
  side: 'left' | 'right'
  plugins: PluginViewModel
  resolveRendererView: (viewId: string) => RendererViewRegistration | null
}) => {
  const slotId = getSidebarSlotId(side)
  const activeView = resolveActiveView(plugins, slotId)
  return activeView ? resolveRendererView(activeView.id) : null
}

const SidebarView = ({
  registration,
  plugins,
  snapshot,
  activeSessionId,
  onActivateSession
}: SidebarViewProps & {
  registration: RendererViewRegistration | null
}) => {
  if (!registration) return null

  const Component = registration.component

  return (
    <Component
      plugins={plugins}
      snapshot={snapshot}
      activeSessionId={activeSessionId}
      onActivateSession={onActivateSession}
    />
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
  dialog,
  onToolbarAction,
  onActivateSession,
  resolveRendererView
}: AppShellProps) => {
  const leftRegistration = resolveSidebarRegistration({ side: 'left', plugins, resolveRendererView })
  const rightRegistration = resolveSidebarRegistration({ side: 'right', plugins, resolveRendererView })
  const showLeftSidebar = leftVisible
  const showRightSidebar = rightVisible && rightRegistration !== null

  const workspaceClassName = [
    'workspace',
    showLeftSidebar ? 'workspace--left-visible' : 'workspace--left-hidden',
    showRightSidebar ? 'workspace--right-visible' : 'workspace--right-hidden'
  ].join(' ')

  return (
    <div className="app-frame">
      <header className="toolbar">
        <div className="toolbar__brand">
          Sessionry
        </div>
        <Toolbar.Root className="toolbar__actions" aria-label="Terminal actions">
          {plugins.toolbarActionIds
            .map((actionId) => plugins.actions.find((candidate) => candidate.id === actionId))
            .filter((action): action is ActionDescriptor => action !== undefined)
            .map((action) => {
              const Icon = action.icon ? resolveTablerIcon(action.icon) : null
              return (
                <Toolbar.Button key={action.id} className="toolbar__button" data-tooltip={action.name} onClick={() => onToolbarAction(action.id)}>
                  {Icon ? <Icon size={15} /> : action.name}
                </Toolbar.Button>
              )
            })}
        </Toolbar.Root>
      </header>

      <main className={workspaceClassName}>
        {showLeftSidebar ? (
          <aside className="sidebar sidebar--left">
            <SidebarView
              registration={leftRegistration}
              plugins={plugins}
              snapshot={snapshot}
              activeSessionId={activeSessionId}
              onActivateSession={onActivateSession}
            />
          </aside>
        ) : null}

        <section className="workspace-content">{mainContent}</section>

        {showRightSidebar ? (
          <aside className="sidebar sidebar--right">
            <SidebarView
              registration={rightRegistration}
              plugins={plugins}
              snapshot={snapshot}
              activeSessionId={activeSessionId}
              onActivateSession={onActivateSession}
            />
          </aside>
        ) : null}
      </main>

      <footer className="status-bar">
        {plugins.statusItems.map((item) => (
          <div key={item.id} className="status-bar__item">
            <span>{item.label}</span>
            <span>{resolveStatusValue(item, session)}</span>
          </div>
        ))}
      </footer>
      {dialog}
    </div>
  )
}
