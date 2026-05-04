import type { AppPlugin } from '@sessionry/plugin-api'
import { projectSessionsSidebarPlugin } from '@sessionry/plugin-default-view-left-sidebar'
import { sidebarTabBarPlugin } from '@sessionry/plugin-default-view-sidebar-tabbar'
import { codePanePlugin } from '@sessionry/plugin-default-view-code'
import { terminalPanePlugin } from '@sessionry/plugin-default-view-terminal'
import { defaultWorkspacePanePlugin } from '@sessionry/plugin-default-view-workspace'
import { fileBrowserPlugin } from '@sessionry/plugin-default-view-files'
import paneHierarchyDebugPlugin from '@sessionry/plugin-debug-view-pane-hierarchy'
import { defaultThemesPlugin } from '@sessionry/plugin-default-themes'
import { gitVcsPlugin } from '@sessionry/plugin-default-vcs-git'
import { vcsViewPlugin } from '@sessionry/plugin-default-view-vcs'

import { corePlugin } from './corePlugin'

export const builtInPlugins: AppPlugin[] = [
  corePlugin,
  defaultThemesPlugin,
  gitVcsPlugin,
  codePanePlugin,
  terminalPanePlugin,
  defaultWorkspacePanePlugin,
  projectSessionsSidebarPlugin,
  sidebarTabBarPlugin,
  fileBrowserPlugin,
  vcsViewPlugin,
  paneHierarchyDebugPlugin
]
