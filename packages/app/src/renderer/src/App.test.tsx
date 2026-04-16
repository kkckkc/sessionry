import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PluginViewModel } from '@sessionry/plugin-api'
import type { TerminalSessionInfo } from '@sessionry/plugin-api'
import type { WorkspaceStateSnapshot } from '@sessionry/plugin-api'

vi.mock('@sessionry/default-workspace-pane-plugin/renderer', () => ({
  WorkspacePaneTree: () => <div data-testid="workspace-tree-view">workspace tree</div>,
  defaultWorkspacePaneRendererPlugin: {
    id: 'default-workspace-pane-plugin',
    name: 'Default Workspace Pane',
    views: [
      {
        id: 'workspace.default',
        title: 'Workspace',
        slot: 'workspace',
        isDefault: true,
        component: () => <div data-testid="workspace-tree-view">workspace tree</div>
      }
    ]
  },
  getActiveVisibleTerminalPaneId: () => 'pane-terminal'
}))

const pluginModel: PluginViewModel = {
  toolbar: [],
  leftPanels: [],
  rightPanels: [],
  statusItems: [],
  viewsBySlot: {
    workspace: [
      {
        id: 'workspace.default',
        title: 'Workspace',
        slot: 'workspace',
        pluginId: 'default-workspace-pane-plugin',
        isDefault: true
      },
      {
        id: 'workspace.alt',
        title: 'Alternate Workspace',
        slot: 'workspace',
        pluginId: 'alt.plugin'
      }
    ]
  }
}

const terminalSession: TerminalSessionInfo = {
  id: 'terminal-session',
  shell: '/bin/zsh',
  cwd: '/tmp',
  pid: 42,
  state: 'ready'
}

const snapshot: WorkspaceStateSnapshot = {
  projects: [
    {
      id: 'project-1',
      name: 'Project',
      folder: '/tmp/project',
      metadata: {},
      activeViews: { workspace: 'missing.view' },
      sessionIds: ['session-1']
    }
  ],
  sessions: [
    {
      id: 'session-1',
      projectId: 'project-1',
      name: 'Session',
      folder: '/tmp/project',
      rootPaneGroupId: 'group-1'
    }
  ],
  paneGroups: [
    {
      id: 'group-1',
      sessionId: 'session-1',
      name: 'Root',
      direction: 'stacked',
      activeChildId: 'pane-terminal',
      children: [{ kind: 'pane', paneId: 'pane-terminal' }]
    }
  ],
  panes: [{ id: 'pane-terminal', sessionId: 'session-1', type: 'terminal', state: {} }]
}

describe('App', () => {
  const onTerminalState = vi.fn(() => () => {})
  const onWorkspaceEvent = vi.fn(() => () => {})

  beforeEach(() => {
    vi.resetModules()
    window.terminalApp = {
      createTerminalSession: vi.fn(async () => terminalSession),
      sendTerminalInput: vi.fn(),
      resizeTerminal: vi.fn(),
      getPluginModel: vi.fn(async () => pluginModel),
      workspace: {
        read: vi.fn(() => snapshot),
        executeCommand: vi.fn(async () => ({})),
        onEvent: onWorkspaceEvent
      },
      onTerminalData: vi.fn(() => () => {}),
      onTerminalState,
      onTerminalExit: vi.fn(() => () => {})
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the resolved workspace slot view and falls back to the default view for unknown project selections', async () => {
    const { App } = await import('./App')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('workspace-tree-view')).toBeInTheDocument()
    })
  })
})
