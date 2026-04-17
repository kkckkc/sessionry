import { describe, expect, it } from 'vitest'

import { getPaneSlotId, getSidebarSlotId, normalizePlugins, resolveActiveView } from '@sessionry/plugin-api'

describe('normalizePlugins', () => {
  it('collects action, status, and slot view contributions into a renderer model', () => {
    const result = normalizePlugins([
      {
        id: 'one',
        name: 'One',
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
            isDefault: true
          }
        ]
      },
      {
        id: 'two',
        name: 'Two',
        views: [{ id: 'workspace.beta', title: 'Beta View', slot: 'workspace' }]
      }
    ])

    expect(result.actions).toHaveLength(1)
    expect(result.toolbarActionIds).toEqual(['terminal:clear'])
    expect(result.statusItems).toHaveLength(1)
    expect(result.viewsBySlot.workspace.map((view) => view.title)).toEqual(['Alpha View', 'Beta View'])
  })

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
    ])

    expect(resolveActiveView(plugins, 'workspace', 'workspace.beta')?.id).toBe('workspace.beta')
    expect(resolveActiveView(plugins, 'workspace', 'missing')?.id).toBe('workspace.alpha')
    expect(resolveActiveView(plugins, 'workspace', undefined, 'workspace.beta')?.id).toBe('workspace.beta')
  })

  it('preserves plugin registration order for pane slots', () => {
    const plugins = normalizePlugins([
      {
        id: 'one',
        name: 'One',
        views: [{ id: 'pane.terminal.one', title: 'Zeta Terminal', slot: getPaneSlotId('terminal') }]
      },
      {
        id: 'two',
        name: 'Two',
        views: [{ id: 'pane.terminal.two', title: 'Alpha Terminal', slot: getPaneSlotId('terminal') }]
      }
    ])

    expect(plugins.viewsBySlot[getPaneSlotId('terminal')].map((view) => view.id)).toEqual([
      'pane.terminal.one',
      'pane.terminal.two'
    ])
    expect(resolveActiveView(plugins, getPaneSlotId('terminal'))?.id).toBe('pane.terminal.one')
  })

  it('builds stable slot ids for sidebar renderers', () => {
    expect(getSidebarSlotId('left')).toBe('sidebar:left')
    expect(getSidebarSlotId('right')).toBe('sidebar:right')
  })
})
