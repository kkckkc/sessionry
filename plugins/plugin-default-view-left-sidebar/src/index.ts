import type { AppPlugin } from '@sessionry/plugin-api'
import { getSidebarSlotId } from '@sessionry/plugin-api'

export const projectSessionsSidebarPlugin: AppPlugin = {
  id: 'plugin-default-view-left-sidebar',
  name: 'Project Sessions Sidebar',
  panels: [
    {
      id: 'project-sessions.panel',
      title: 'Projects',
      side: 'left',
      pluginId: 'plugin-default-view-left-sidebar'
    }
  ],
  views: [
    {
      id: 'project-sessions.panel.view',
      title: 'Projects',
      slot: getSidebarSlotId('left'),
      isDefault: true
    }
  ]
}

export default projectSessionsSidebarPlugin
