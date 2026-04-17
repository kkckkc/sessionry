import type { AppPlugin } from '@sessionry/plugin-api'
import { defaultWorkspacePanePlugin } from '../../../../plugins/plugin-default-view-workspace'
import { projectSessionsSidebarPlugin } from '../../../../plugins/plugin-default-view-left-sidebar'
import { terminalPanePlugin } from '../../../../plugins/plugin-default-view-terminal'

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
