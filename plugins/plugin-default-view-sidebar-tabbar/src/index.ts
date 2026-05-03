import type { AppPlugin } from '@sessionry/plugin-api'

export const sidebarTabBarPlugin: AppPlugin = {
  id: 'plugin-default-view-sidebar-tabbar',
  name: 'Sidebar Tab Bar',
  viewMode: 'multi-view',
  views: [
    {
      id: 'sidebar.right.tabbar',
      slot: 'sidebar:right',
      title: 'Sidebar Tabs'
    }
  ]
}

export default sidebarTabBarPlugin
