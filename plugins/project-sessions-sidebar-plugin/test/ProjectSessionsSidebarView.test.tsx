import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { PluginViewModel, WorkspaceStateSnapshot } from '@sessionry/plugin-api'

import projectSessionsSidebarRendererPlugin from '../src/renderer'

const plugins: PluginViewModel = {
  actions: [],
  toolbarActionIds: [],
  leftPanels: [],
  rightPanels: [],
  statusItems: [],
  viewsBySlot: {}
}

const snapshot: WorkspaceStateSnapshot = {
  projects: [
    {
      id: 'project-1',
      name: 'Alpha',
      folder: '/tmp/alpha',
      metadata: {},
      activeViews: {},
      sessionIds: ['session-1', 'session-2']
    }
  ],
  sessions: [
    { id: 'session-1', projectId: 'project-1', name: 'First', folder: '/tmp/alpha', rootPaneGroupId: 'group-1' },
    { id: 'session-2', projectId: 'project-1', name: 'Second', folder: '/tmp/alpha', rootPaneGroupId: 'group-2' }
  ],
  paneGroups: [],
  panes: [],
  activeSessionId: 'session-2'
}

describe('ProjectSessionsSidebarView', () => {
  it('renders project sessions and activates the clicked session', () => {
    const onActivateSession = vi.fn()
    const Component = projectSessionsSidebarRendererPlugin.views?.[0]?.component

    if (!Component) {
      throw new Error('Expected project sessions sidebar renderer to register a component.')
    }

    render(
      <Component
        panel={{
          id: 'project-sessions.panel',
          title: 'Projects',
          side: 'left',
          pluginId: 'project-sessions-sidebar-plugin'
        }}
        plugins={plugins}
        snapshot={snapshot}
        activeSessionId="session-2"
        onActivateSession={onActivateSession}
      />
    )

    expect(screen.getByRole('button', { name: 'Second' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'First' }))

    expect(onActivateSession).toHaveBeenCalledWith('session-1')
  })
})
