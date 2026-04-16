import { describe, expect, it } from 'vitest'

import { normalizePlugins } from './pluginRegistry'

describe('normalizePlugins', () => {
  it('collects toolbar, sidebar, and status contributions into a renderer model', () => {
    const result = normalizePlugins([
      {
        id: 'one',
        name: 'One',
        toolbar: [{ id: 'terminal:clear', label: 'Clear', description: 'Clear output' }],
        panels: [{ id: 'b', title: 'Beta', side: 'right', pluginId: 'one' }],
        statusItems: [{ id: 'state', label: 'State', kind: 'session-state' }]
      },
      {
        id: 'two',
        name: 'Two',
        panels: [{ id: 'a', title: 'Alpha', side: 'left', pluginId: 'two' }]
      }
    ])

    expect(result.toolbar).toHaveLength(1)
    expect(result.leftPanels.map((panel) => panel.title)).toEqual(['Alpha'])
    expect(result.rightPanels.map((panel) => panel.title)).toEqual(['Beta'])
    expect(result.statusItems).toHaveLength(1)
  })
})
