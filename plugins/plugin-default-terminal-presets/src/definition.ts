import type { AppPlugin } from '@sessionry/plugin-api';

export const terminalPresetsPluginDefinition: AppPlugin = {
  id: 'plugin-default-terminal-presets',
  name: 'Terminal Presets',
  settingsView: {
    id: 'settings.terminal-presets',
    title: 'Terminal Presets',
    description: 'Configure reusable terminal commands for the new pane menu',
    icon: 'TbTerminal2'
  }
};
