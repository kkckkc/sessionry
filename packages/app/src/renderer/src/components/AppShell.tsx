import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import * as TbIcons from 'react-icons/tb'

import { Toolbar } from '@base-ui-components/react/toolbar'
import { Tooltip } from '@base-ui-components/react/tooltip'

import type { ActionDescriptor, PluginViewModel, SidebarViewProps } from '@sessionry/plugin-api'
import type { TerminalSessionInfo } from '@sessionry/plugin-api'
import { resolveActiveView } from '@sessionry/plugin-api'
import type { RendererViewRegistration } from '@sessionry/plugin-api'
import type { WorkspaceApi } from '@sessionry/plugin-api'

import { resolveStatusValue } from '../lib/pluginPanels'

interface AppShellProps {
  plugins: PluginViewModel
  workspace: WorkspaceApi
  session: TerminalSessionInfo | null
  leftVisible: boolean
  rightVisible: boolean
  mainContent: ReactNode
  onToolbarAction: (actionId: string) => void
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
  const slotId = `sidebar:${side}`
  const activeView = resolveActiveView(plugins, slotId)
  return activeView ? resolveRendererView(activeView.id) : null
}

const SidebarView = ({
  registration,
  plugins,
  workspace,
  resolveRendererView
}: SidebarViewProps & {
  registration: RendererViewRegistration | null
}) => {
  if (!registration) return null

  const Component = registration.component

  return (
    <Component
      plugins={plugins}
      workspace={workspace}
      resolveRendererView={resolveRendererView}
    />
  )
}

export const AppShell = ({
  plugins,
  workspace,
  session,
  leftVisible,
  rightVisible,
  mainContent,
  onToolbarAction,
  resolveRendererView
}: AppShellProps) => {
  const leftRegistration = resolveSidebarRegistration({ side: 'left', plugins, resolveRendererView })
  const rightRegistration = resolveSidebarRegistration({ side: 'right', plugins, resolveRendererView })
  const showLeftSidebar = leftVisible
  const showRightSidebar = rightVisible && rightRegistration !== null

  const workspaceClassName = [
    'workspace',
    showLeftSidebar ? 'is-left-visible' : 'is-left-hidden',
    showRightSidebar ? 'is-right-visible' : 'is-right-hidden'
  ].join(' ')

  return (
    <div className="app-frame">
      <header className="toolbar">
        <div className="brand">
          Sessionry
        </div>
        <Toolbar.Root className="actions" aria-label="Terminal actions">
          {plugins.toolbarActionIds
            .map((actionId) => plugins.actions.find((candidate) => candidate.id === actionId))
            .filter((action): action is ActionDescriptor => action !== undefined)
            .map((action) => {
              const Icon = action.icon ? resolveTablerIcon(action.icon) : null
              return (
                <Tooltip.Root key={action.id} delay={600}>
                  <Tooltip.Trigger render={<Toolbar.Button className="btn" onClick={() => onToolbarAction(action.id)} />}>
                    {Icon ? <Icon size={15} /> : action.name}
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner>
                      <Tooltip.Popup className="tooltip">{action.name}</Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
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
              workspace={workspace}
              resolveRendererView={resolveRendererView}
            />
          </aside>
        ) : null}

        <section className="workspace-content">{mainContent}</section>

        {showRightSidebar ? (
          <aside className="sidebar sidebar--right">
            <SidebarView
              registration={rightRegistration}
              plugins={plugins}
              workspace={workspace}
              resolveRendererView={resolveRendererView}
            />
          </aside>
        ) : null}
      </main>

      <footer className="status-bar">
        {plugins.statusItems.map((item) => (
          <div key={item.id} className="item">
            <span>{item.label}</span>
            <span>{resolveStatusValue(item, session)}</span>
          </div>
        ))}
      </footer>
    </div>
  )
}
