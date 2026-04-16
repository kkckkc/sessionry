import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { PluginViewModel } from '@sessionry/plugin-api'
import type { TerminalSessionInfo } from '@sessionry/plugin-api'

import { AppShell } from './AppShell'

const plugins: PluginViewModel = {
  toolbar: [{ id: 'terminal:clear', label: 'Clear', description: 'Clear terminal' }],
  leftPanels: [{ id: 'navigation.panel', title: 'Workspace', side: 'left', pluginId: 'nav' }],
  rightPanels: [{ id: 'inspector.panel', title: 'Inspector', side: 'right', pluginId: 'inspector' }],
  statusItems: [{ id: 'state', label: 'State', kind: 'session-state' }],
  viewsBySlot: {}
}

const session: TerminalSessionInfo = {
  id: 'primary',
  shell: '/bin/zsh',
  cwd: '/tmp',
  pid: 123,
  state: 'ready'
}

describe('AppShell', () => {
  it('renders the toolbar, sidebars, terminal region, and status bar', () => {
    render(
      <AppShell
        plugins={plugins}
        session={session}
        leftVisible
        rightVisible
        mainContent={<div data-testid="workspace-content">workspace</div>}
        onToolbarAction={() => {}}
      />
    )

    expect(screen.getByRole('heading', { name: 'Workspace' })).toBeInTheDocument()
    expect(screen.getByLabelText('Workspace')).toBeInTheDocument()
    expect(screen.getByLabelText('Inspector')).toBeInTheDocument()
    expect(screen.getByText('State')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    expect(screen.getByTestId('workspace-content')).toBeInTheDocument()
  })
})
