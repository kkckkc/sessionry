import type { AppPlugin } from '@sessionry/plugin-api'

export const defaultWorkspacePanePlugin: AppPlugin = {
  id: 'default-workspace-pane-plugin',
  name: 'Default Workspace Pane',
  views: [
    {
      id: 'workspace.default',
      title: 'Workspace',
      slot: 'workspace',
      isDefault: true
    }
  ]
}

export default defaultWorkspacePanePlugin
