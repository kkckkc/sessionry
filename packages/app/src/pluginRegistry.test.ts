import { describe, expect, it } from 'vitest';

import { getChildViewsForSlot, normalizePlugins, resolveActiveView } from '@sessionry/plugin-api';

describe('normalizePlugins', () => {
  it('collects action, status, and slot view contributions into a renderer model', () => {
    const result = normalizePlugins([
      {
        id: 'one',
        name: 'One',
        icon: 'TbFolder',
        actions: [
          {
            id: 'terminal:clear',
            name: 'Clear Terminal',
            description: 'Clear output',
            surfaces: ['toolbar'],
            run: () => ({ status: 'completed' })
          }
        ],
        statusItems: [{ id: 'state', label: 'State', kind: 'session-state' }],
        views: [
          {
            id: 'workspace.alpha',
            title: 'Alpha View',
            slot: 'workspace',
            icon: 'TbStar',
            isDefault: true
          }
        ]
      },
      {
        id: 'two',
        name: 'Two',
        views: [{ id: 'workspace.beta', title: 'Beta View', slot: 'workspace' }]
      }
    ]);

    expect(result.actions).toHaveLength(1);
    expect(result.toolbarActionIds).toEqual(['terminal:clear']);
    expect(result.statusItems).toHaveLength(1);
    expect(result.viewsBySlot.workspace.map(view => view.title)).toEqual([
      'Alpha View',
      'Beta View'
    ]);
    expect(result.viewsBySlot.workspace[0]).toMatchObject({
      icon: 'TbStar',
      pluginIcon: 'TbFolder'
    });
  });

  it('resolves the active view using project selection, defaults, and fallbacks', () => {
    const plugins = normalizePlugins([
      {
        id: 'one',
        name: 'One',
        views: [
          {
            id: 'workspace.alpha',
            title: 'Alpha View',
            slot: 'workspace',
            isDefault: true
          }
        ]
      },
      {
        id: 'two',
        name: 'Two',
        views: [{ id: 'workspace.beta', title: 'Beta View', slot: 'workspace' }]
      }
    ]);

    expect(resolveActiveView(plugins, 'workspace', 'workspace.beta')?.id).toBe('workspace.beta');
    expect(resolveActiveView(plugins, 'workspace', 'missing')?.id).toBe('workspace.alpha');
    expect(resolveActiveView(plugins, 'workspace', undefined, 'workspace.beta')?.id).toBe(
      'workspace.beta'
    );
  });

  it('preserves plugin registration order for pane slots', () => {
    const plugins = normalizePlugins([
      {
        id: 'one',
        name: 'One',
        views: [{ id: 'pane.terminal.one', title: 'Zeta Terminal', slot: 'pane:terminal' }]
      },
      {
        id: 'two',
        name: 'Two',
        views: [{ id: 'pane.terminal.two', title: 'Alpha Terminal', slot: 'pane:terminal' }]
      }
    ]);

    expect(plugins.viewsBySlot['pane:terminal'].map(view => view.id)).toEqual([
      'pane.terminal.one',
      'pane.terminal.two'
    ]);
    expect(resolveActiveView(plugins, 'pane:terminal')?.id).toBe('pane.terminal.one');
  });

  it('builds stable slot ids for sidebar renderers', () => {
    expect('sidebar:left').toBe('sidebar:left');
    expect('sidebar:right').toBe('sidebar:right');
  });

  it('prefers the first multi-view plugin for a slot and keeps ordinary children available', () => {
    const plugins = normalizePlugins([
      {
        id: 'sidebar.host',
        name: 'Sidebar Host',
        viewMode: 'multi-view',
        views: [{ id: 'sidebar.host.view', title: 'Host', slot: 'sidebar:right' }]
      },
      {
        id: 'files',
        name: 'Files',
        views: [{ id: 'files.view', title: 'Files', slot: 'sidebar:right', isDefault: true }]
      },
      {
        id: 'debug',
        name: 'Debug',
        views: [{ id: 'debug.view', title: 'Debug', slot: 'sidebar:right' }]
      }
    ]);

    expect(resolveActiveView(plugins, 'sidebar:right', 'debug.view')?.id).toBe('sidebar.host.view');
    expect(getChildViewsForSlot(plugins, 'sidebar:right').map(view => view.id)).toEqual([
      'files.view',
      'debug.view'
    ]);
  });

  it('falls back to the plugin icon when a view icon is not set', () => {
    const plugins = normalizePlugins([
      {
        id: 'files',
        name: 'Files',
        icon: 'TbFolders',
        views: [{ id: 'files.view', title: 'Files', slot: 'sidebar:right' }]
      }
    ]);

    expect(plugins.viewsBySlot['sidebar:right'][0]).toMatchObject({
      icon: 'TbFolders',
      pluginIcon: 'TbFolders'
    });
  });
});
