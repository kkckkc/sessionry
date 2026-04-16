import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { PluginViewModel, WorkspaceStateSnapshot } from '@sessionry/plugin-api'
import type { TerminalSessionInfo } from '@sessionry/plugin-api'
import { getSidebarPanelSlotId } from '@sessionry/plugin-api'

import { AppShell } from './AppShell'

const snapshot: WorkspaceStateSnapshot = {
  projects: [],
  sessions: [],
  paneGroups: [],
  panes: []
}

const plugins: PluginViewModel = {
  toolbar: [{ id: 'terminal:clear', label: 'Clear', description: 'Clear terminal' }],
  leftPanels: [{ id: 'navigation.panel', title: 'Workspace', side: 'left', pluginId: 'nav' }],
  rightPanels: [{ id: 'inspector.panel', title: 'Inspector', side: 'right', pluginId: 'inspector' }],
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
        onToolbarAction={() => {}}
        onActivateSession={() => {}}
        resolveRendererView={() => null}
      />
    )

    expect(screen.getByRole('heading', { name: 'Workspace' })).toBeInTheDocument()
    expect(screen.getByLabelText('Workspace')).toBeInTheDocument()
    expect(screen.getByLabelText('Inspector')).toBeInTheDocument()
    expect(screen.getByText('State')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    expect(screen.getByTestId('workspace-content')).toBeInTheDocument()
  })

  it('renders a sidebar panel renderer when a matching slot view exists', () => {
    const sidebarPlugins: PluginViewModel = {
      ...plugins,
      viewsBySlot: {
        [getSidebarPanelSlotId('left', 'navigation.panel')]: [
          {
            id: 'navigation.panel.view',
            title: 'Workspace',
            slot: getSidebarPanelSlotId('left', 'navigation.panel'),
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
        onToolbarAction={() => {}}
        onActivateSession={() => {}}
        resolveRendererView={() => ({
          component: () => <div data-testid="sidebar-panel-renderer">custom sidebar</div>
        })}
      />
    )

    expect(screen.getByTestId('sidebar-panel-renderer')).toBeInTheDocument()
  })
})
