import type { AppPlugin } from '@sessionry/plugin-api';

export const terminalPanePluginDefinition: Omit<AppPlugin, 'activateMain'> = {
  id: 'plugin-default-view-terminal',
  name: 'Terminal Pane',
  settingsView: {
    id: 'settings.terminal',
    title: 'Terminal',
    description: 'Configure terminal and tmux settings',
    icon: 'TbTerminal'
  },
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
};
