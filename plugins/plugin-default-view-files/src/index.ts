import type { AppPlugin } from '@sessionry/plugin-api';

export const fileBrowserPlugin: AppPlugin = {
  id: 'default-view-files',
  name: 'File Browser',
  icon: 'TbFolders',
  views: [
    {
      id: 'file-browser',
      slot: 'sidebar:right',
      title: 'Files',
      isDefault: true
    }
  ]
};
