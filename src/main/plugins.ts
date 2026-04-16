import type { AppPlugin } from '@shared/plugins'

export const builtInPlugins: AppPlugin[] = [
  {
    id: 'core.terminal',
    name: 'Terminal',
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
    ]
  },
  {
    id: 'layout.navigation',
    name: 'Navigation',
    panels: [
      {
        id: 'navigation.panel',
        title: 'Workspace',
        side: 'left',
        pluginId: 'layout.navigation'
      }
    ]
  },
  {
    id: 'layout.inspector',
    name: 'Inspector',
    panels: [
      {
        id: 'inspector.panel',
        title: 'Inspector',
        side: 'right',
        pluginId: 'layout.inspector'
      }
    ]
  }
]
