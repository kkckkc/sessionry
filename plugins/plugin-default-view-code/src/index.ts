import type { AppPlugin } from '@sessionry/plugin-api';

export const codePanePlugin: AppPlugin = {
  id: 'plugin-default-view-code',
  name: 'Code Pane',
  icon: 'TbFileCode',
  views: [
    {
      id: 'pane.code.default',
      title: 'Code',
      slot: 'pane:code',
      isDefault: true
    }
  ]
};

export default codePanePlugin;
