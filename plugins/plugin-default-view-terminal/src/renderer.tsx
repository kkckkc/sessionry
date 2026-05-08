import type { RendererAppPlugin } from '@sessionry/plugin-api';

import { terminalPanePluginDefinition } from './definition';
import { TerminalPaneView } from './TerminalPaneView';
import { TerminalSettingsView } from './SettingsView';

const terminalView = terminalPanePluginDefinition.views?.[0];

if (!terminalView) {
  throw new Error('terminalPanePluginDefinition must register a pane view.');
}

export const terminalPaneRendererPlugin: RendererAppPlugin = {
  id: terminalPanePluginDefinition.id,
  name: terminalPanePluginDefinition.name,
  actions: terminalPanePluginDefinition.actions,
  statusItems: terminalPanePluginDefinition.statusItems,
  views: [
    {
      ...terminalView,
      component: TerminalPaneView
    }
  ],
  settingsView: terminalPanePluginDefinition.settingsView
    ? {
        ...terminalPanePluginDefinition.settingsView,
        component: TerminalSettingsView
      }
    : undefined
};

export { TerminalPaneView };

export default terminalPaneRendererPlugin;
