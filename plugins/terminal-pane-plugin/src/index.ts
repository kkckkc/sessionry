import type { AppPlugin } from '@sessionry/plugin-api'
import { getPaneSlotId } from '@sessionry/plugin-api'

export const terminalPanePlugin: AppPlugin = {
  id: 'terminal-pane-plugin',
  name: 'Terminal Pane',
  toolbar: [
    {
      id: 'terminal:new',
      label: 'New Session',
      description: 'Restart the terminal session.'
    },
    {
      id: 'terminal:clear',
      label: 'Clear',
      description: 'Clear the current terminal buffer.'
    },
    {
      id: 'layout:toggle-left',
      label: 'Toggle Left',
      description: 'Show or hide the left sidebar.'
    },
    {
      id: 'layout:toggle-right',
      label: 'Toggle Right',
      description: 'Show or hide the right sidebar.'
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
      slot: getPaneSlotId('terminal'),
      isDefault: true
    }
  ]
}

export default terminalPanePlugin
