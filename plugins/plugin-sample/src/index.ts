import type { AppPlugin } from '@sessionry/plugin-api';

const samplePlugin: AppPlugin = {
  id: 'sample-plugin',
  name: 'Sample Plugin',
  views: [
    {
      id: 'sample-plugin.view',
      title: 'Sample',
      slot: 'workspace'
    }
  ]
};

export default samplePlugin;
