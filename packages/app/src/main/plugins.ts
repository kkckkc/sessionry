import type { AppPlugin } from '@sessionry/plugin-api'
import { defaultWorkspacePanePlugin } from '@sessionry/default-workspace-pane-plugin'
import { projectSessionsSidebarPlugin } from '@sessionry/project-sessions-sidebar-plugin'
import { terminalPanePlugin } from '@sessionry/terminal-pane-plugin'

export const builtInPlugins: AppPlugin[] = [
  terminalPanePlugin,
  defaultWorkspacePanePlugin,
  projectSessionsSidebarPlugin,
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
