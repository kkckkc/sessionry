import type { AppPlugin, MainPluginContext } from '@sessionry/plugin-api'
import { TERMINAL_IPC_CHANNELS } from '@sessionry/plugin-api'

const activateMain = async (context: MainPluginContext): Promise<void> => {
  // Dynamic import ensures node-pty is never evaluated in the renderer process,
  // since renderer.tsx imports index.ts to spread the plugin definition.
  const { TerminalService } = await import('./terminalService')

  const terminalService = new TerminalService(
    (event) => context.ipc.emit(TERMINAL_IPC_CHANNELS.data, event),
    (event) => context.ipc.emit(TERMINAL_IPC_CHANNELS.state, event),
    (event) => context.ipc.emit(TERMINAL_IPC_CHANNELS.exit, event),
    context.settings.tmux
  )

  context.ipc.handle(TERMINAL_IPC_CHANNELS.create, (input) =>
    terminalService.createSession(input as Parameters<typeof terminalService.createSession>[0])
  )
  context.ipc.on(TERMINAL_IPC_CHANNELS.input, (payload) =>
    terminalService.handleInput(payload as Parameters<typeof terminalService.handleInput>[0])
  )
  context.ipc.on(TERMINAL_IPC_CHANNELS.resize, (payload) =>
    terminalService.handleResize(payload as Parameters<typeof terminalService.handleResize>[0])
  )

  context.workspace.subscribeAll((event) => {
    if (event.type === 'pane.removed' && event.before.type === 'terminal') {
      terminalService.killSession(event.before.id)
    }
  })

  context.onBeforeQuit(() => terminalService.dispose())
}

export const terminalPanePlugin: AppPlugin = {
  id: 'plugin-default-view-terminal',
  name: 'Terminal Pane',
  activateMain,
  actions: [
    {
      id: 'terminal:new',
      name: 'Restart Terminal',
      icon: 'TbRefresh',
      description: 'Restart the active terminal session.',
      category: 'Terminal',
      defaultKeybinding: 'C-Shift-r',
      surfaces: ['toolbar', 'palette'],
      run: () => ({
        status: 'completed',
        effects: [{ type: 'terminal.restart-active' }]
      })
    },
    {
      id: 'terminal:clear',
      name: 'Clear Terminal',
      icon: 'TbEraser',
      description: 'Clear the active terminal buffer.',
      category: 'Terminal',
      defaultKeybinding: 'C-l',
      surfaces: ['toolbar', 'palette'],
      run: () => ({
        status: 'completed',
        effects: [{ type: 'terminal.clear-active' }]
      })
    },
    {
      id: 'layout:toggle-left',
      name: 'Toggle Left Sidebar',
      icon: 'TbLayoutSidebar',
      description: 'Show or hide the left sidebar.',
      category: 'Layout',
      defaultKeybinding: 'C-b',
      surfaces: ['toolbar', 'palette'],
      run: () => ({
        status: 'completed',
        effects: [{ type: 'layout.toggle-left' }]
      })
    },
    {
      id: 'layout:toggle-right',
      name: 'Toggle Right Sidebar',
      icon: 'TbLayoutSidebarRight',
      description: 'Show or hide the right sidebar.',
      category: 'Layout',
      defaultKeybinding: 'C-Shift-b',
      surfaces: ['toolbar', 'palette'],
      run: () => ({
        status: 'completed',
        effects: [{ type: 'layout.toggle-right' }]
      })
    },
    {
      id: 'session:create',
      name: 'Create Session',
      icon: 'TbPlus',
      description: 'Create a new workspace session for the active project.',
      category: 'Session',
      defaultKeybinding: 'C-Shift-n',
      surfaces: ['toolbar', 'palette'],
      args: [
        {
          name: 'projectId',
          label: 'Project',
          description: 'Project that will own the new session.',
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
        },
        {
          name: 'folder',
          label: 'Working directory',
          description: 'Defaults to the selected project folder.',
          type: 'string'
        }
      ],
      run: async (context, args) => {
        const projectId = typeof args.projectId === 'string' ? args.projectId : context.activeProjectId
        const name = typeof args.name === 'string' ? args.name.trim() : ''
        const folderArg = typeof args.folder === 'string' ? args.folder.trim() : ''

        if (!projectId || !name) {
          return { status: 'completed' }
        }

        const project = context.workspace.getProject(projectId)
        if (!project) {
          throw new Error(`Project "${projectId}" was not found.`)
        }

        const session = await project.createSession({
          name,
          folder: folderArg.length > 0 ? folderArg : project.data.folder
        })
        await session.createPane({
          type: 'terminal',
          state: {
            title: 'Terminal'
          },
          parentPaneGroupId: session.data.rootPaneGroupId
        })
        await session.activate()

        return { status: 'completed' }
      }
    }
  ],
  statusItems: [
    { id: 'session-state', label: 'State', kind: 'session-state' },
    { id: 'shell', label: 'Shell', kind: 'shell' },
    { id: 'cwd', label: 'Directory', kind: 'cwd' },
    { id: 'connection', label: 'Connection', kind: 'connection' }
  ],
  views: [
    {
      id: 'pane.terminal.default',
      title: 'Terminal',
      slot: 'pane:terminal',
      isDefault: true
    }
  ]
}

export default terminalPanePlugin
