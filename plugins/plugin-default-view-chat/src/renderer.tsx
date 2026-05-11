import type { RendererAppPlugin } from '@sessionry/plugin-api';
import { chatPluginDefinition } from './definition';
import { ChatView } from './ChatView';
import { ChatSettingsView } from './SettingsView';
import { isProviderReady, normalizeChatSettings } from './settings';
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
    : undefined,
  providePaneCreations: async () => {
    const settings = normalizeChatSettings(
      (await window.terminalApp.settings.read()).plugins?.['plugin-default-view-chat']
    );

    const readyProviders = settings.providers
      .filter(isProviderReady)
      .sort((left, right) => {
        const leftPriority = left.id === settings.defaultProviderId ? 0 : 1;
        const rightPriority = right.id === settings.defaultProviderId ? 0 : 1;
        return (
          leftPriority - rightPriority ||
          left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
        );
      });

    return readyProviders.map((provider, index) => ({
      id: `chat-${provider.id}`,
      title: `Chat with ${provider.name}`,
      icon: 'TbMessageCircle',
      order: 20 + index,
      paneType: 'chat',
      defaultState: {
        name: `Chat with ${provider.name}`,
        title: `Chat with ${provider.name}`,
        providerId: provider.id
      }
    }));
  }
};

export default chatRendererPlugin;
