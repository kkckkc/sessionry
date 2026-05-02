import type { AppPlugin } from '@sessionry/plugin-api'
import { projectSessionsSidebarPlugin } from '@sessionry/plugin-default-view-left-sidebar'
import { terminalPanePlugin } from '@sessionry/plugin-default-view-terminal'
import { defaultWorkspacePanePlugin } from '@sessionry/plugin-default-view-workspace'
import { fileBrowserPlugin } from '@sessionry/plugin-default-view-files'

import { corePlugin } from './corePlugin'

export const builtInPlugins: AppPlugin[] = [
  corePlugin,
  terminalPanePlugin,
  defaultWorkspacePanePlugin,
  projectSessionsSidebarPlugin,
  fileBrowserPlugin
]
