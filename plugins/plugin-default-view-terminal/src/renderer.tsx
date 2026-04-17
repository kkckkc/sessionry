import type { RendererAppPlugin } from '@sessionry/plugin-api'

import { TerminalPaneView } from './TerminalPaneView'
import { terminalPanePlugin } from './index.js'

const terminalView = terminalPanePlugin.views?.[0]

if (!terminalView) {
  throw new Error('terminalPanePlugin must register a pane view.')
}

export const terminalPaneRendererPlugin: RendererAppPlugin = {
  ...terminalPanePlugin,
  views: [
    {
      ...terminalView,
      component: TerminalPaneView
    }
  ]
}

export { TerminalPaneView }

export default terminalPaneRendererPlugin
