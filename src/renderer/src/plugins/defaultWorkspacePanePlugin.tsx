import type { RendererAppPlugin } from '@shared/plugins'

import { WorkspacePaneTree } from '../components/WorkspacePaneTree'
import { defaultWorkspacePanePlugin } from '../../../plugins/defaultWorkspacePanePlugin'

const workspaceView = defaultWorkspacePanePlugin.views?.[0]

if (!workspaceView) {
  throw new Error('defaultWorkspacePanePlugin must register a workspace view.')
}

export const defaultWorkspacePaneRendererPlugin: RendererAppPlugin = {
  ...defaultWorkspacePanePlugin,
  views: [
    {
      ...workspaceView,
      component: WorkspacePaneTree
    }
  ]
}
