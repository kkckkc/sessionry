import type { AppPlugin } from '@sessionry/plugin-api';

export const vcsViewPlugin: AppPlugin = {
  id: 'plugin-default-view-vcs',
  name: 'VCS View',
  icon: 'TbGitBranch',
  views: [
    {
      id: 'vcs.panel.view',
      title: 'Changes',
      slot: 'sidebar:right',
      isDefault: true
    }
  ]
};

export default vcsViewPlugin;
