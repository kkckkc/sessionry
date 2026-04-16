import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { vi } from 'vitest'

import type { PluginViewModel } from '@shared/plugins'
import type { TerminalSessionInfo } from '@shared/terminal'

import { AppShell } from './AppShell'

vi.mock('./TerminalView', () => ({
  TerminalView: () => <div data-testid="terminal-view">terminal</div>
}))

const plugins: PluginViewModel = {
  toolbar: [{ id: 'terminal:clear', label: 'Clear', description: 'Clear terminal' }],
  leftPanels: [{ id: 'navigation.panel', title: 'Workspace', side: 'left', pluginId: 'nav' }],
  rightPanels: [{ id: 'inspector.panel', title: 'Inspector', side: 'right', pluginId: 'inspector' }],
  statusItems: [{ id: 'state', label: 'State', kind: 'session-state' }]
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
        clearSignal={0}
        leftVisible
        rightVisible
        onToolbarAction={() => {}}
      />
    )

    expect(screen.getByRole('heading', { name: 'Workspace' })).toBeInTheDocument()
    expect(screen.getByLabelText('Workspace')).toBeInTheDocument()
    expect(screen.getByLabelText('Inspector')).toBeInTheDocument()
    expect(screen.getByText('Session')).toBeInTheDocument()
    expect(screen.getByText('State')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    expect(screen.getByTestId('terminal-view')).toBeInTheDocument()
  })
})
