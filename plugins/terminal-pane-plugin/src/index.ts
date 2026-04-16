import type { AppPlugin } from '@sessionry/plugin-api'
import { getPaneSlotId } from '@sessionry/plugin-api'

export const terminalPanePlugin: AppPlugin = {
  id: 'terminal-pane-plugin',
  name: 'Terminal Pane',
  actions: [
    {
      id: 'terminal:new',
      name: 'Restart Terminal',
      description: 'Restart the active terminal session.',
      category: 'Terminal',
      defaultKeybinding: 'C-Shift-r',
      surfaces: ['toolbar', 'palette'],
      run: () => ({
        status: 'completed',
        effects: [{ type: 'terminal.restart-active' }]
      })
    },
    {
      id: 'terminal:clear',
      name: 'Clear Terminal',
      description: 'Clear the active terminal buffer.',
      category: 'Terminal',
      defaultKeybinding: 'C-l',
      surfaces: ['toolbar', 'palette'],
      run: () => ({
        status: 'completed',
        effects: [{ type: 'terminal.clear-active' }]
      })
    },
    {
      id: 'layout:toggle-left',
      name: 'Toggle Left Sidebar',
      description: 'Show or hide the left sidebar.',
      category: 'Layout',
      defaultKeybinding: 'C-b',
      surfaces: ['toolbar', 'palette'],
      run: () => ({
        status: 'completed',
        effects: [{ type: 'layout.toggle-left' }]
      })
    },
    {
      id: 'layout:toggle-right',
      name: 'Toggle Right Sidebar',
      description: 'Show or hide the right sidebar.',
      category: 'Layout',
      defaultKeybinding: 'C-Shift-b',
      surfaces: ['toolbar', 'palette'],
      run: () => ({
        status: 'completed',
        effects: [{ type: 'layout.toggle-right' }]
      })
    },
    {
      id: 'session:create',
      name: 'Create Session',
      description: 'Create a new workspace session for the active project.',
      category: 'Session',
      defaultKeybinding: 'C-Shift-n',
      surfaces: ['toolbar', 'palette'],
      args: [
        {
          name: 'projectId',
          label: 'Project',
          description: 'Project that will own the new session.',
          type: 'entity-ref',
          entityType: 'project',
          required: true,
          fromContext: 'activeProjectId'
        },
        {
          name: 'name',
          label: 'Session name',
          type: 'string',
          required: true
        },
        {
          name: 'folder',
          label: 'Working directory',
          description: 'Defaults to the selected project folder.',
          type: 'string'
        }
      ],
      run: async (context, args) => {
        const projectId = typeof args.projectId === 'string' ? args.projectId : context.activeProjectId
        const name = typeof args.name === 'string' ? args.name.trim() : ''
        const folderArg = typeof args.folder === 'string' ? args.folder.trim() : ''

        if (!projectId || !name) {
          return { status: 'completed' }
        }

        const project = context.workspace.getProject(projectId)
        if (!project) {
          throw new Error(`Project "${projectId}" was not found.`)
        }

        await project.createSession({
          name,
          folder: folderArg.length > 0 ? folderArg : project.data.folder
        })

        return { status: 'completed' }
      }
    }
  ],
  statusItems: [
    { id: 'session-state', label: 'State', kind: 'session-state' },
    { id: 'shell', label: 'Shell', kind: 'shell' },
    { id: 'cwd', label: 'Directory', kind: 'cwd' },
    { id: 'connection', label: 'Connection', kind: 'connection' }
  ],
  views: [
    {
      id: 'pane.terminal.default',
      title: 'Terminal',
      slot: getPaneSlotId('terminal'),
      isDefault: true
    }
  ]
}

export default terminalPanePlugin
