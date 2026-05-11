import type { AppPlugin } from '@sessionry/plugin-api';

export const chatPluginDefinition: AppPlugin = {
  id: 'plugin-default-view-chat',
  name: 'Chat Pane',
  icon: 'TbMessageCircle',
  unsafeIpc: true,
  actions: [
    {
      id: 'chat:new',
      name: 'New Chat',
      icon: 'TbMessageCircle',
      description: 'Create a new chat pane',
      category: 'Chat',
      surfaces: ['palette'],
      run: () => ({
        status: 'completed',
        effects: [{ type: 'pane.new-chat' }]
      })
    }
  ],
  views: [
    {
      id: 'pane.chat.default',
      title: 'Chat',
      slot: 'pane:chat',
      isDefault: true
    }
  ],
  settingsView: {
    id: 'chat-settings',
    title: 'Chat',
    description: 'Configure AI provider and chat behavior',
    icon: 'TbMessageCircle'
  }
};
