import type { AppPlugin } from '@sessionry/plugin-api';
import { terminalPresetsPluginDefinition } from './definition';

export const terminalPresetsPlugin: AppPlugin = {
  ...terminalPresetsPluginDefinition
};

export default terminalPresetsPlugin;
