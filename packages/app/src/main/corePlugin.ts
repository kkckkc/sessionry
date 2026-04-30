import type { AppPlugin } from '@sessionry/plugin-api'

export const corePlugin: AppPlugin = {
  id: 'core',
  name: 'Core',
  actions: [
    {
      id: 'layout:toggle-left',
      name: 'Toggle Left Sidebar',
      icon: 'TbLayoutSidebarLeftCollapse',
      description: 'Show or hide the left sidebar',
      category: 'Layout',
      defaultKeybinding: 'C-b',
      surfaces: ['toolbar', 'palette'],
      run: async () => {
        return {
          status: 'completed',
          effects: [{ type: 'layout.toggle-left' }]
        }
      }
    },
    {
      id: 'layout:toggle-right',
      name: 'Toggle Right Sidebar',
      icon: 'TbLayoutSidebarRightCollapse',
      description: 'Show or hide the right sidebar',
      category: 'Layout',
      defaultKeybinding: 'C-S-b',
      surfaces: ['toolbar', 'palette'],
      run: async () => {
        return {
          status: 'completed',
          effects: [{ type: 'layout.toggle-right' }]
        }
      }
    },
    {
      id: 'app:open-settings',
      name: 'Open Settings',
      icon: 'TbSettings',
      description: 'Open application settings',
      category: 'Application',
      defaultKeybinding: 'C-,',
      surfaces: ['toolbar', 'palette'],
      run: async (context) => {
        const activeProject = context.workspace.getProject(context.activeProjectId!)
        if (!activeProject) return { status: 'completed' }

        await activeProject.update({
          activeViews: {
            ...activeProject.data.activeViews,
            workspace: 'view.settings'
          }
        })

        return { status: 'completed' }
      }
    },
    {
      id: 'workspace:show-default-view',
      name: 'Show Default Workspace View',
      description: 'Return to the default workspace view',
      category: 'Workspace',
      run: async (context) => {
        const activeProject = context.workspace.getProject(context.activeProjectId!)
        if (!activeProject) return { status: 'completed' }

        await activeProject.update({
          activeViews: {
            ...activeProject.data.activeViews,
            workspace: undefined
          }
        })

        return { status: 'completed' }
      }
    }
  ],
  views: [
    {
      id: 'view.settings',
      title: 'Settings',
      slot: 'workspace'
    }
  ]
}
