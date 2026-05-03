import * as React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { PluginViewModel, WorkspaceApi, WorkspaceStateSnapshot } from '@sessionry/plugin-api'
import type { TerminalSessionInfo } from '@sessionry/plugin-api'

import { AppShell } from './AppShell'

const snapshot: WorkspaceStateSnapshot = {
  projects: [],
  sessions: [],
  paneGroups: [],
  panes: []
}

const workspace: WorkspaceApi = {
  get snapshot() {
    return snapshot
  },
  projects: [],
  getProject: () => null,
  getSession: () => null,
  getPaneGroup: () => null,
  getPane: () => null,
  subscribe: () => () => {},
  subscribeAll: () => () => {},
  createProject: async () => {
    throw new Error('Not implemented in test')
  }
}

const plugins: PluginViewModel = {
  actions: [{ id: 'terminal:clear', name: 'Clear Terminal', description: 'Clear terminal', surfaces: ['toolbar'] }],
  toolbarActionIds: ['terminal:clear'],
  statusItems: [{ id: 'state', label: 'State', kind: 'session-state' }],
  viewsBySlot: {}
}

const session: TerminalSessionInfo = {
  id: 'primary',
  shell: '/bin/zsh',
  cwd: '/tmp',
  pid: 123,
  state: 'ready'
}

describe('AppShell', () => {
  it('renders the toolbar, sidebars, terminal region, and status bar', () => {
    render(
      <AppShell
        plugins={plugins}
        workspace={workspace}
        session={session}
        leftVisible
        rightVisible
        statusBarVisible
        mainContent={<div data-testid="workspace-content">workspace</div>}
        onToolbarAction={() => {}}
        resolveRendererView={() => null}
      />
    )

    expect(screen.getByText('Sessionry')).toBeInTheDocument()
    expect(screen.getByText('State')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear Terminal' })).toBeInTheDocument()
    expect(screen.getByTestId('workspace-content')).toBeInTheDocument()
  })

  it('renders a sidebar slot view when a matching slot view exists', () => {
    const sidebarPlugins: PluginViewModel = {
      ...plugins,
      viewsBySlot: {
        'sidebar:left': [
          {
            id: 'navigation.panel.view',
            title: 'Workspace',
            slot: 'sidebar:left',
            pluginId: 'nav',
            viewMode: 'single-view',
            isDefault: true
          }
        ]
      }
    }

    render(
      <AppShell
        plugins={sidebarPlugins}
        workspace={workspace}
        session={session}
        leftVisible
        rightVisible={false}
        statusBarVisible
        mainContent={<div data-testid="workspace-content">workspace</div>}
        onToolbarAction={() => {}}
        resolveRendererView={() => ({
          component: () => <div data-testid="sidebar-view-renderer">custom sidebar</div>
        })}
      />
    )

    expect(screen.getByTestId('sidebar-view-renderer')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-view-renderer').closest('[data-plugin-id="nav"]')).toHaveAttribute(
      'data-plugin-surface',
      'sidebar'
    )
  })

  it('renders no sidebar content when a visible side has no registered view', () => {
    const { container } = render(
      <AppShell
        plugins={plugins}
        workspace={workspace}
        session={session}
        leftVisible={false}
        rightVisible
        statusBarVisible
        mainContent={<div data-testid="workspace-content">workspace</div>}
        onToolbarAction={() => {}}
        resolveRendererView={() => null}
      />
    )

    expect(container.querySelector('.sidebar--right')).toBeNull()
    expect(container.querySelector('.workspace')).toHaveClass('is-right-hidden')
    expect(screen.queryByText('No content registered')).not.toBeInTheDocument()
  })

  it('renders a multi-view right sidebar host and switches child views with tabs', () => {
    const HostComponent = ({
      childViews,
      resolveRendererView
    }: {
      childViews: Array<{ id: string; title: string }>
      resolveRendererView: (viewId: string) => { component: () => React.JSX.Element } | null
    }) => {
      const [activeViewId, setActiveViewId] = React.useState(childViews[0]?.id ?? '')
      const ActiveComponent = resolveRendererView(activeViewId)?.component

      return (
        <div>
          {childViews.map((view) => (
            <button key={view.id} type="button" onClick={() => setActiveViewId(view.id)}>
              {view.title}
            </button>
          ))}
          {ActiveComponent ? <ActiveComponent /> : null}
        </div>
      )
    }

    const sidebarPlugins: PluginViewModel = {
      ...plugins,
      viewsBySlot: {
        'sidebar:right': [
          {
            id: 'sidebar.right.tabbar',
            title: 'Sidebar Tabs',
            slot: 'sidebar:right',
            pluginId: 'plugin-default-view-sidebar-tabbar',
            viewMode: 'multi-view'
          },
          {
            id: 'file-browser',
            title: 'Files',
            slot: 'sidebar:right',
            pluginId: 'default-view-files',
            viewMode: 'single-view',
            isDefault: true
          },
          {
            id: 'pane-hierarchy',
            title: 'Pane Hierarchy',
            slot: 'sidebar:right',
            pluginId: 'debug-view-pane-hierarchy',
            viewMode: 'single-view'
          }
        ]
      }
    }

    render(
      <AppShell
        plugins={sidebarPlugins}
        workspace={workspace}
        session={session}
        leftVisible={false}
        rightVisible
        statusBarVisible
        mainContent={<div data-testid="workspace-content">workspace</div>}
        onToolbarAction={() => {}}
        resolveRendererView={(viewId) => {
          if (viewId === 'sidebar.right.tabbar') {
            return { component: HostComponent }
          }

          if (viewId === 'file-browser') {
            return { component: () => <div data-testid="files-view">files</div> }
          }

          if (viewId === 'pane-hierarchy') {
            return { component: () => <div data-testid="pane-hierarchy-view">pane hierarchy</div> }
          }

          return null
        }}
      />
    )

    expect(screen.getByTestId('files-view')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pane Hierarchy' }))

    expect(screen.getByTestId('pane-hierarchy-view')).toBeInTheDocument()
  })
})
