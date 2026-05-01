import type { AppPlugin, MainPluginContext } from '@sessionry/plugin-api'
import { TERMINAL_IPC_CHANNELS } from '@sessionry/plugin-api'
import type { TerminalPluginSettings } from './settings'

const activateMain = async (context: MainPluginContext): Promise<void> => {
  // Dynamic import ensures node-pty is never evaluated in the renderer process,
  // since renderer.tsx imports index.ts to spread the plugin definition.
  const { TerminalService } = await import('./terminalService')

  const pluginSettings = context.settings.plugins['plugin-default-view-terminal'] as TerminalPluginSettings | undefined
  const tmuxSettings = pluginSettings?.tmux ?? {
    enabled: false,
    dedicatedSocket: true,
    disableStatusBar: false,
    inheritConfig: true,
    killOnExit: true
  }

  const terminalService = new TerminalService(
    (event) => context.ipc.emit(TERMINAL_IPC_CHANNELS.data, event),
    (event) => context.ipc.emit(TERMINAL_IPC_CHANNELS.state, event),
    (event) => context.ipc.emit(TERMINAL_IPC_CHANNELS.exit, event),
    tmuxSettings
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
  settingsView: {
    id: 'settings.terminal',
    title: 'Terminal',
    description: 'Configure terminal and tmux settings',
    icon: 'TbTerminal'
  },
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
