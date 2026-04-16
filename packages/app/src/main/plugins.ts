import type { AppPlugin } from '@sessionry/plugin-api'
import { defaultWorkspacePanePlugin } from '@sessionry/default-workspace-pane-plugin'
import { terminalPanePlugin } from '@sessionry/terminal-pane-plugin'

export const builtInPlugins: AppPlugin[] = [
  terminalPanePlugin,
  defaultWorkspacePanePlugin,
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
