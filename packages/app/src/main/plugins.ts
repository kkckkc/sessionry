import type { AppPlugin } from '@sessionry/plugin-api'
import { projectSessionsSidebarPlugin } from '@sessionry/plugin-default-view-left-sidebar'
import { sidebarTabBarPlugin } from '@sessionry/plugin-default-view-sidebar-tabbar'
import { terminalPanePlugin } from '@sessionry/plugin-default-view-terminal'
import { defaultWorkspacePanePlugin } from '@sessionry/plugin-default-view-workspace'
import { fileBrowserPlugin } from '@sessionry/plugin-default-view-files'
import paneHierarchyDebugPlugin from '@sessionry/plugin-debug-view-pane-hierarchy'

import { corePlugin } from './corePlugin'

export const builtInPlugins: AppPlugin[] = [
  corePlugin,
  terminalPanePlugin,
  defaultWorkspacePanePlugin,
  projectSessionsSidebarPlugin,
  sidebarTabBarPlugin,
  fileBrowserPlugin,
  paneHierarchyDebugPlugin
]
