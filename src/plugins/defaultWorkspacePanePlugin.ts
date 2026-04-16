import type { AppPlugin } from '@shared/plugins'

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
