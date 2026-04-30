import type { RendererAppPlugin } from '@sessionry/plugin-api'

import { defaultWorkspacePanePlugin } from '.'
import { WorkspacePaneTree, getActiveVisibleTerminalPaneId } from './WorkspacePaneTree'

const workspaceView = defaultWorkspacePanePlugin.views?.[0]

if (!workspaceView) {
  throw new Error('defaultWorkspacePanePlugin must register a workspace view.')
}

export const defaultWorkspacePaneRendererPlugin: RendererAppPlugin = {
  id: defaultWorkspacePanePlugin.id,
  name: defaultWorkspacePanePlugin.name,
  views: [
    {
      ...workspaceView,
      component: WorkspacePaneTree
    }
  ]
}

export { WorkspacePaneTree, getActiveVisibleTerminalPaneId }
