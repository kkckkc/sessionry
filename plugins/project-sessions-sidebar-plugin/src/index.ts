import type { AppPlugin } from '@sessionry/plugin-api'
import { getSidebarPanelSlotId } from '@sessionry/plugin-api'

export const projectSessionsSidebarPlugin: AppPlugin = {
  id: 'project-sessions-sidebar-plugin',
  name: 'Project Sessions Sidebar',
  panels: [
    {
      id: 'project-sessions.panel',
      title: 'Projects',
      side: 'left',
      pluginId: 'project-sessions-sidebar-plugin'
    }
  ],
  views: [
    {
      id: 'project-sessions.panel.view',
      title: 'Projects',
      slot: getSidebarPanelSlotId('left', 'project-sessions.panel'),
      isDefault: true
    }
  ]
}

export default projectSessionsSidebarPlugin
