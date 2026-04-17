import type { AppPlugin } from '@sessionry/plugin-api'
import { projectSessionsSidebarPlugin } from '@sessionry/plugin-default-view-left-sidebar'
import { terminalPanePlugin } from '@sessionry/plugin-default-view-terminal'
import { defaultWorkspacePanePlugin } from '@sessionry/plugin-default-view-workspace'

export const builtInPlugins: AppPlugin[] = [
  terminalPanePlugin,
  defaultWorkspacePanePlugin,
  projectSessionsSidebarPlugin
]
