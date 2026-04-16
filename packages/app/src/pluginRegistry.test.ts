import { describe, expect, it } from 'vitest'

import { getPaneSlotId, getSidebarPanelSlotId, normalizePlugins, resolveActiveView } from '@sessionry/plugin-api'

describe('normalizePlugins', () => {
  it('collects toolbar, sidebar, status, and slot view contributions into a renderer model', () => {
    const result = normalizePlugins([
      {
        id: 'one',
        name: 'One',
        toolbar: [{ id: 'terminal:clear', label: 'Clear', description: 'Clear output' }],
        panels: [{ id: 'b', title: 'Beta', side: 'right', pluginId: 'one' }],
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
        panels: [{ id: 'a', title: 'Alpha', side: 'left', pluginId: 'two' }],
        views: [{ id: 'workspace.beta', title: 'Beta View', slot: 'workspace' }]
      }
    ])

    expect(result.toolbar).toHaveLength(1)
    expect(result.leftPanels.map((panel) => panel.title)).toEqual(['Alpha'])
    expect(result.rightPanels.map((panel) => panel.title)).toEqual(['Beta'])
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

  it('builds stable slot ids for sidebar panel renderers', () => {
    expect(getSidebarPanelSlotId('left', 'project-sessions.panel')).toBe('sidebar:left:project-sessions.panel')
    expect(getSidebarPanelSlotId('right', 'inspector.panel')).toBe('sidebar:right:inspector.panel')
  })
})
