import type { AppPlugin } from '@sessionry/plugin-api';

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
      defaultKeybinding: 'C-S-l',
      surfaces: ['palette'],
      run: async () => {
        return {
          status: 'completed',
          effects: [{ type: 'layout.toggle-left' }]
        };
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
        };
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
      run: async context => {
        const activeProject = context.workspace.getProject(context.activeProjectId!);
        if (!activeProject) return { status: 'completed' };

        await activeProject.update({
          activeViews: {
            ...activeProject.data.activeViews,
            workspace: 'view.settings'
          }
        });

        return { status: 'completed' };
      }
    },
    {
      id: 'workspace:show-default-view',
      name: 'Show Default Workspace View',
      description: 'Return to the default workspace view',
      category: 'Workspace',
      run: async context => {
        const activeProject = context.workspace.getProject(context.activeProjectId!);
        if (!activeProject) return { status: 'completed' };

        await activeProject.update({
          activeViews: {
            ...activeProject.data.activeViews,
            workspace: undefined
          }
        });

        return { status: 'completed' };
      }
    },
    {
      id: 'pane:close-focused',
      name: 'Close Focused Pane',
      icon: 'TbX',
      description: 'Close the currently focused pane',
      category: 'Pane',
      defaultKeybinding: 'C-w',
      surfaces: ['palette'],
      run: async context => {
        const activeSession = context.workspace.getSession(context.activeSessionId!);
        if (!activeSession) return { status: 'completed' };

        const focusedPaneId = activeSession.data.focusedPaneId;
        if (!focusedPaneId) return { status: 'completed' };

        const focusedPane = context.workspace.getPane(focusedPaneId);
        if (!focusedPane) return { status: 'completed' };

        return {
          status: 'completed',
          effects: [{ type: 'pane.close-focused', payload: { paneId: focusedPaneId } }]
        };
      }
    },
    {
      id: 'pane:new-tab',
      name: 'New Tab',
      icon: 'TbPlus',
      description: 'Create a new terminal tab in the active pane group',
      category: 'Pane',
      defaultKeybinding: 'C-t',
      surfaces: ['palette'],
      run: async context => {
        const activeSession = context.workspace.getSession(context.activeSessionId!);
        if (!activeSession) return { status: 'completed' };

        const focusedPaneId = activeSession.data.focusedPaneId;

        return {
          status: 'completed',
          effects: [{ type: 'pane.new-tab', payload: { focusedPaneId } }]
        };
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
};
