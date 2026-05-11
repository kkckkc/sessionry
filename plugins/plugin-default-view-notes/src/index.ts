import type { AppPlugin } from '@sessionry/plugin-api';

export const notesViewPlugin: AppPlugin = {
  id: 'plugin-default-view-notes',
  name: 'Notes',
  icon: 'TbNotes',
  views: [
    {
      id: 'notes.panel.view',
      title: 'Notes',
      slot: 'sidebar:right',
      isDefault: false
    }
  ]
};

export default notesViewPlugin;
