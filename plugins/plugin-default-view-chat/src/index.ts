import type { AppPlugin } from '@sessionry/plugin-api';

export const chatPlugin: AppPlugin = {
  id: 'plugin-default-view-chat',
  name: 'Chat Pane',
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
  ]
};

export default chatPlugin;
