import type { AppPlugin } from '@sessionry/plugin-api';

export const plugin: AppPlugin = {
  id: 'debug-view-pane-hierarchy',
  name: 'Pane Hierarchy Debug View',
  views: [
    {
      id: 'pane-hierarchy',
      title: 'Pane Hierarchy',
      slot: 'sidebar:right',
      icon: 'TbBug'
    }
  ]
};

export default plugin;
