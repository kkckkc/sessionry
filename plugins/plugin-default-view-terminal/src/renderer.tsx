import type { RendererAppPlugin } from '@sessionry/plugin-api';

import { TerminalPaneView } from './TerminalPaneView';
import { TerminalSettingsView } from './SettingsView';
import { terminalPanePlugin } from '.';

const terminalView = terminalPanePlugin.views?.[0];

if (!terminalView) {
  throw new Error('terminalPanePlugin must register a pane view.');
}

export const terminalPaneRendererPlugin: RendererAppPlugin = {
  id: terminalPanePlugin.id,
  name: terminalPanePlugin.name,
  actions: terminalPanePlugin.actions,
  statusItems: terminalPanePlugin.statusItems,
  views: [
    {
      ...terminalView,
      component: TerminalPaneView
    }
  ],
  settingsView: terminalPanePlugin.settingsView
    ? {
        ...terminalPanePlugin.settingsView,
        component: TerminalSettingsView
      }
    : undefined
};

export { TerminalPaneView };

export default terminalPaneRendererPlugin;
