import type { RendererAppPlugin } from '@sessionry/plugin-api';

import chatPlugin from '.';

function ChatView() {
  return (
    <div style={{ padding: '1rem' }}>
      <h2>Chat</h2>
      <p>Chat functionality coming soon...</p>
    </div>
  );
}

const chatRendererPlugin: RendererAppPlugin = {
  ...chatPlugin,
  views: [
    {
      ...chatPlugin.views![0],
      component: ChatView
    }
  ]
};

export default chatRendererPlugin;
