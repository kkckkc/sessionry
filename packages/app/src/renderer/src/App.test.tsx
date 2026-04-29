import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActionExecutionResult, PluginViewModel } from '@sessionry/plugin-api'
import type { TerminalSessionInfo } from '@sessionry/plugin-api'
import type { WorkspaceStateSnapshot } from '@sessionry/plugin-api'

vi.mock('@sessionry/plugin-default-view-workspace/renderer', () => ({
  WorkspacePaneTree: () => <div data-testid="workspace-tree-view">workspace tree</div>,
  defaultWorkspacePaneRendererPlugin: {
    id: 'plugin-default-view-workspace',
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

vi.mock('@sessionry/plugin-default-view-terminal/renderer', () => ({
  terminalPaneRendererPlugin: {
    id: 'plugin-default-view-terminal',
    name: 'Terminal Pane',
    views: [
      {
        id: 'pane.terminal.default',
        title: 'Terminal',
        slot: 'pane:terminal',
        isDefault: true,
        component: () => <div data-testid="terminal-pane-renderer">terminal renderer</div>
      }
    ]
  }
}))

vi.mock('@sessionry/plugin-default-view-left-sidebar/renderer', () => ({
  projectSessionsSidebarRendererPlugin: {
    id: 'plugin-default-view-left-sidebar',
    name: 'Project Sessions Sidebar',
    views: [
      {
        id: 'project-sessions.panel.view',
        title: 'Projects',
        slot: 'sidebar:left',
        isDefault: true,
        component: ({ workspace }: { workspace: { getSession: (sessionId: string) => { activate(): Promise<void> } | null } }) => (
          <button type="button" onClick={() => void workspace.getSession('session-1')?.activate()}>
            Session nav
          </button>
        )
      }
    ]
  }
}))

const pluginModel: PluginViewModel = {
  actions: [],
  toolbarActionIds: [],
  statusItems: [],
  viewsBySlot: {
    'pane:terminal': [
      {
        id: 'pane.terminal.default',
        title: 'Terminal',
        slot: 'pane:terminal',
        pluginId: 'plugin-default-view-terminal',
        isDefault: true
      }
    ],
    workspace: [
      {
        id: 'workspace.default',
        title: 'Workspace',
        slot: 'workspace',
        pluginId: 'plugin-default-view-workspace',
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
  id: 'pane-terminal',
  shell: '/bin/zsh',
  cwd: '/tmp',
  pid: 42,
  state: 'ready',
  buffer: ''
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
  panes: [{ id: 'pane-terminal', sessionId: 'session-1', type: 'terminal', state: {} }],
  activeSessionId: 'session-1'
}

describe('App', () => {
  const onTerminalState = vi.fn(() => () => {})
  const onWorkspaceEvent = vi.fn(() => () => {})

  beforeEach(() => {
    vi.resetModules()
    window.terminalApp = {
      showFolderDialog: vi.fn(),
      createTerminalSession: vi.fn(async () => terminalSession),
      sendTerminalInput: vi.fn(),
      resizeTerminal: vi.fn(),
      getPluginModel: vi.fn(async () => pluginModel),
      getUserPluginRenderers: vi.fn(async () => []),
      actions: {
        list: vi.fn(async () => []),
        execute: vi.fn(async (): Promise<ActionExecutionResult> => ({ status: 'completed' }))
      },
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

  it('activates a session from sidebar interactions through workspace commands', async () => {
    const executeCommand = vi.fn(async () => ({}))

    window.terminalApp = {
      showFolderDialog: vi.fn(),
      createTerminalSession: vi.fn(async () => terminalSession),
      sendTerminalInput: vi.fn(),
      resizeTerminal: vi.fn(),
      getPluginModel: vi.fn(async (): Promise<PluginViewModel> => ({
        ...pluginModel,
        viewsBySlot: {
          ...pluginModel.viewsBySlot,
          'sidebar:left': [
            {
              id: 'project-sessions.panel.view',
              title: 'Projects',
              slot: 'sidebar:left',
              pluginId: 'nav',
              isDefault: true
            }
          ]
        }
      })),
      getUserPluginRenderers: vi.fn(async () => []),
      actions: {
        list: vi.fn(async () => []),
        execute: vi.fn(async (): Promise<ActionExecutionResult> => ({ status: 'completed' }))
      },
      workspace: {
        read: vi.fn(() => snapshot),
        executeCommand,
        onEvent: onWorkspaceEvent
      },
      onTerminalData: vi.fn(() => () => {}),
      onTerminalState,
      onTerminalExit: vi.fn(() => () => {})
    }

    const { App } = await import('./App')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('workspace tree')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Session nav' }))

    expect(executeCommand).toHaveBeenCalledWith({ type: 'session.activate', sessionId: 'session-1' })
  })

  it('runs toolbar actions through the action bridge and shows the argument collector when needed', async () => {
    window.terminalApp = {
      createTerminalSession: vi.fn(async () => terminalSession),
      sendTerminalInput: vi.fn(),
      resizeTerminal: vi.fn(),
      getPluginModel: vi.fn(
        async (): Promise<PluginViewModel> => ({
          ...pluginModel,
          actions: [
            {
              id: 'session:create',
              name: 'Create Session',
              description: 'Create a new workspace session.',
              surfaces: ['toolbar'],
              args: [
                {
                  name: 'projectId',
                  label: 'Project',
                  type: 'entity-ref',
                  entityType: 'project',
                  required: true,
                  fromContext: 'activeProjectId'
                },
                {
                  name: 'name',
                  label: 'Session name',
                  type: 'string',
                  required: true
                }
              ]
            }
          ],
          toolbarActionIds: ['session:create']
        })
      ),
      getUserPluginRenderers: vi.fn(async () => []),
      actions: {
        list: vi.fn(async () => []),
        execute: vi
          .fn()
          .mockResolvedValueOnce({
            status: 'needs-input',
            action: {
              id: 'session:create',
              name: 'Create Session',
              description: 'Create a new workspace session.',
              surfaces: ['toolbar'],
              args: [
                {
                  name: 'projectId',
                  label: 'Project',
                  type: 'entity-ref',
                  entityType: 'project',
                  required: true,
                  fromContext: 'activeProjectId'
                },
                {
                  name: 'name',
                  label: 'Session name',
                  type: 'string',
                  required: true
                }
              ]
            },
            providedArgs: {},
            resolvedArgs: { projectId: 'project-1' },
            missing: [{ name: 'name', label: 'Session name', type: 'string', required: true }]
          })
          .mockResolvedValueOnce({ status: 'completed' })
      },
      workspace: {
        read: vi.fn(() => snapshot),
        executeCommand: vi.fn(async () => ({})),
        onEvent: onWorkspaceEvent
      },
      onTerminalData: vi.fn(() => () => {}),
      onTerminalState,
      onTerminalExit: vi.fn(() => () => {}),
      showFolderDialog: vi.fn()
    }

    const { App } = await import('./App')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Session' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Create Session' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Session name'), { target: { value: 'Focus' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Run' }).closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(window.terminalApp.actions.execute).toHaveBeenLastCalledWith({
        actionId: 'session:create',
        source: 'toolbar',
        args: { projectId: 'project-1', name: 'Focus' }
      })
    })
  })

})
