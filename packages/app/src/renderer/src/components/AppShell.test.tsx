import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { PluginViewModel, WorkspaceStateSnapshot } from '@sessionry/plugin-api'
import type { TerminalSessionInfo } from '@sessionry/plugin-api'
import { getSidebarSlotId } from '@sessionry/plugin-api'

import { AppShell } from './AppShell'

const snapshot: WorkspaceStateSnapshot = {
  projects: [],
  sessions: [],
  paneGroups: [],
  panes: []
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
        session={session}
        snapshot={snapshot}
        leftVisible
        rightVisible
        mainContent={<div data-testid="workspace-content">workspace</div>}
        dialog={null}
        onToolbarAction={() => {}}
        onActivateSession={() => {}}
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
        [getSidebarSlotId('left')]: [
          {
            id: 'navigation.panel.view',
            title: 'Workspace',
            slot: getSidebarSlotId('left'),
            pluginId: 'nav',
            isDefault: true
          }
        ]
      }
    }

    render(
      <AppShell
        plugins={sidebarPlugins}
        session={session}
        snapshot={snapshot}
        leftVisible
        rightVisible={false}
        mainContent={<div data-testid="workspace-content">workspace</div>}
        dialog={null}
        onToolbarAction={() => {}}
        onActivateSession={() => {}}
        resolveRendererView={() => ({
          component: () => <div data-testid="sidebar-view-renderer">custom sidebar</div>
        })}
      />
    )

    expect(screen.getByTestId('sidebar-view-renderer')).toBeInTheDocument()
  })

  it('renders no sidebar content when a visible side has no registered view', () => {
    const { container } = render(
      <AppShell
        plugins={plugins}
        session={session}
        snapshot={snapshot}
        leftVisible={false}
        rightVisible
        mainContent={<div data-testid="workspace-content">workspace</div>}
        dialog={null}
        onToolbarAction={() => {}}
        onActivateSession={() => {}}
        resolveRendererView={() => null}
      />
    )

    expect(container.querySelector('.sidebar--right')).toBeNull()
    expect(container.querySelector('.workspace')).toHaveClass('is-right-hidden')
    expect(screen.queryByText('No content registered')).not.toBeInTheDocument()
  })
})
