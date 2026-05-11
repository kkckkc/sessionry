import type { PaneCreationContribution, RendererAppPlugin } from '@sessionry/plugin-api';

import { terminalPresetsPluginDefinition } from './definition';
import { TerminalPresetsSettingsView } from './SettingsView';
import { getTerminalPresetsSettings } from './settings';

const terminalPresetsRendererPlugin: RendererAppPlugin = {
  id: terminalPresetsPluginDefinition.id,
  name: terminalPresetsPluginDefinition.name,
  settingsView: terminalPresetsPluginDefinition.settingsView
    ? {
        ...terminalPresetsPluginDefinition.settingsView,
        component: TerminalPresetsSettingsView
      }
    : undefined,
  providePaneCreations: async (): Promise<PaneCreationContribution[]> => {
    const settings = await window.terminalApp.settings.read();
    const pluginSettings = getTerminalPresetsSettings(
      settings.plugins[terminalPresetsPluginDefinition.id]
    );

    return pluginSettings.presets.map((preset, index) => ({
      id: `terminal-preset:${preset.id}`,
      title: preset.name,
      description: preset.command,
      icon: preset.icon,
      order: 100 + index,
      group: 'Terminal Presets',
      paneType: 'terminal',
      defaultState: {
        name: preset.name,
        title: 'Terminal',
        initialCommand: preset.command,
        initialCommandPending: true,
        presetId: preset.id
      }
    }));
  }
};

export default terminalPresetsRendererPlugin;
export { TerminalPresetsSettingsView };
