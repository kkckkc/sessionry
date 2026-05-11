import type { RendererAppPlugin } from '@sessionry/plugin-api';
import { chatPluginDefinition } from './definition';
import { ChatView } from './ChatView';
import { ChatSettingsView } from './SettingsView';
import './styles.css';

const chatRendererPlugin: RendererAppPlugin = {
  ...chatPluginDefinition,
  views: [
    {
      ...chatPluginDefinition.views![0],
      component: ChatView
    }
  ],
  settingsView: chatPluginDefinition.settingsView
    ? {
        ...chatPluginDefinition.settingsView,
        component: ChatSettingsView
      }
    : undefined
};

export default chatRendererPlugin;
