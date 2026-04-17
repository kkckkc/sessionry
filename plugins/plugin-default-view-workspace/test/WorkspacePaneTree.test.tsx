/// <reference types="@testing-library/jest-dom" />
import * as React from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { PaneViewProps, PluginViewModel, WorkspaceStateSnapshot } from '@sessionry/plugin-api'

import { WorkspacePaneTree } from '../src/WorkspacePaneTree'

const paneRendererSpy = vi.fn()

const plugins: PluginViewModel = {
  actions: [],
  toolbarActionIds: [],
  leftPanels: [],
  rightPanels: [],
  statusItems: [],
  viewsBySlot: {
    'pane:terminal': [
      {
        id: 'pane.terminal.default',
        title: 'Terminal',
        slot: 'pane:terminal',
        pluginId: 'plugin-default-view-terminal',
        isDefault: true
      }
    ]
  }
}

const paneRendererRegistration = {
  component: (props: PaneViewProps) => {
    paneRendererSpy(props)
    return (
      <div data-testid="terminal-view">
        <button type="button" data-testid="terminal-focus-target">
          terminal
        </button>
        <span data-testid="terminal-visible">{String(props.visible)}</span>
      </div>
    )
  }
}

const snapshot: WorkspaceStateSnapshot = {
  projects: [{ id: 'project-1', name: 'Project', folder: '/tmp/project', metadata: {}, activeViews: {}, sessionIds: ['session-1'] }],
  sessions: [{ id: 'session-1', projectId: 'project-1', name: 'Session', folder: '/tmp/project', rootPaneGroupId: 'root' }],
  paneGroups: [
    {
      id: 'root',
      sessionId: 'session-1',
      name: 'Workspace',
      direction: 'horizontal',
      preferredSizePct: 100,
      children: [
        { kind: 'group', paneGroupId: 'left-tabs' },
        { kind: 'group', paneGroupId: 'right-column' }
      ]
    },
    {
      id: 'left-tabs',
      sessionId: 'session-1',
      name: 'Editors',
      direction: 'stacked',
      preferredSizePct: 58,
      activeChildId: 'pane-terminal',
      children: [
        { kind: 'pane', paneId: 'pane-terminal' },
        { kind: 'pane', paneId: 'pane-activity' }
      ]
    },
    {
      id: 'right-column',
      sessionId: 'session-1',
      name: 'Side Column',
      direction: 'vertical',
      preferredSizePct: 42,
      children: [
        { kind: 'pane', paneId: 'pane-outline' },
        { kind: 'group', paneGroupId: 'bottom-tabs' }
      ]
    },
    {
      id: 'bottom-tabs',
      sessionId: 'session-1',
      name: 'Inspectors',
      direction: 'stacked',
      preferredSizePct: 55,
      activeChildId: 'pane-inspector',
      children: [
        { kind: 'pane', paneId: 'pane-inspector' },
        { kind: 'pane', paneId: 'pane-problems' }
      ]
    }
  ],
  panes: [
    { id: 'pane-terminal', sessionId: 'session-1', type: 'terminal', preferredSizePct: 50, state: { title: 'Terminal' } },
    { id: 'pane-activity', sessionId: 'session-1', type: 'activity', preferredSizePct: 50, state: { title: 'Activity' } },
    { id: 'pane-outline', sessionId: 'session-1', type: 'outline', preferredSizePct: 45, state: { title: 'Outline' } },
    { id: 'pane-inspector', sessionId: 'session-1', type: 'inspector', preferredSizePct: 60, state: { title: 'Inspector' } },
    { id: 'pane-problems', sessionId: 'session-1', type: 'problems', preferredSizePct: 40, state: { title: 'Problems' } }
  ]
}

describe('WorkspacePaneTree', () => {
  it('renders horizontal, vertical, and stacked groups with preferred sizes', () => {
    render(
      <WorkspacePaneTree
        plugins={plugins}
        snapshot={snapshot}
        projectId="project-1"
        sessionId="session-1"
        resolveRendererView={() => paneRendererRegistration}
        terminalSession={null}
        clearSignal={0}
        activeTerminalPaneId="pane-terminal"
        onSelectStackedChild={() => {}}
      />
    )

    expect(screen.getByTestId('group-root')).toHaveClass('workspace-node--horizontal')
    expect(screen.getByTestId('group-right-column')).toHaveClass('workspace-node--vertical')
    expect(screen.getByRole('tablist', { name: 'Editors tabs' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Inspectors tabs' })).toBeInTheDocument()
    expect(screen.getByTestId('group-left-tabs')).toHaveStyle({ flexBasis: '58%' })
    expect(screen.getByTestId('pane-pane-outline')).toHaveStyle({ flexBasis: '45%' })
    expect(screen.getByTestId('terminal-view')).toBeInTheDocument()
    expect(screen.getByTestId('pane-pane-terminal')).toHaveClass('pane-card--bare')
    expect(screen.getByTestId('pane-pane-terminal').querySelector('.pane-card__header')).toBeNull()
    expect(screen.getByTestId('pane-pane-outline').querySelector('.pane-card__header')).not.toBeNull()
  })

  it('switches active tab content through the model callback and passes visibility to the pane renderer', () => {
    const Harness = () => {
      const [currentSnapshot, setCurrentSnapshot] = React.useState(snapshot)

      return (
        <WorkspacePaneTree
          plugins={plugins}
          snapshot={currentSnapshot}
          projectId="project-1"
          sessionId="session-1"
          resolveRendererView={() => paneRendererRegistration}
          terminalSession={null}
          clearSignal={0}
          activeTerminalPaneId="pane-terminal"
          onSelectStackedChild={(paneGroupId, childId) => {
            setCurrentSnapshot((value) => ({
              ...value,
              paneGroups: value.paneGroups.map((paneGroup) =>
                paneGroup.id === paneGroupId ? { ...paneGroup, activeChildId: childId } : paneGroup
              )
            }))
          }}
        />
      )
    }

    render(<Harness />)

    expect(screen.getByTestId('terminal-view')).toBeInTheDocument()
    expect(screen.getByTestId('terminal-visible')).toHaveTextContent('true')
    expect(screen.getByLabelText('Terminal').closest('.workspace-stacked-panel')).toHaveClass('workspace-stacked-panel--active')

    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))

    expect(screen.getByTestId('terminal-view')).toBeInTheDocument()
    expect(screen.getByTestId('terminal-visible')).toHaveTextContent('false')
    expect(screen.getByLabelText('Activity').closest('.workspace-stacked-panel')).toHaveClass('workspace-stacked-panel--active')
    expect(screen.getByLabelText('Terminal').closest('.workspace-stacked-panel')).not.toHaveClass('workspace-stacked-panel--active')
  })

  it('restores focus to the last focused element when returning to a tab', async () => {
    const Harness = () => {
      const [currentSnapshot, setCurrentSnapshot] = React.useState(snapshot)

      return (
        <WorkspacePaneTree
          plugins={plugins}
          snapshot={currentSnapshot}
          projectId="project-1"
          sessionId="session-1"
          resolveRendererView={() => paneRendererRegistration}
          terminalSession={null}
          clearSignal={0}
          activeTerminalPaneId="pane-terminal"
          onSelectStackedChild={(paneGroupId, childId) => {
            setCurrentSnapshot((value) => ({
              ...value,
              paneGroups: value.paneGroups.map((paneGroup) =>
                paneGroup.id === paneGroupId ? { ...paneGroup, activeChildId: childId } : paneGroup
              )
            }))
          }}
        />
      )
    }

    render(<Harness />)

    const terminalFocusTarget = screen.getByTestId('terminal-focus-target')
    terminalFocusTarget.focus()
    expect(document.activeElement).toBe(terminalFocusTarget)

    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Terminal' }))

    await waitFor(() => {
      expect(document.activeElement).toBe(terminalFocusTarget)
    })
  })

  it('falls back to placeholder content when no pane renderer is registered', () => {
    render(
      <WorkspacePaneTree
        plugins={{ ...plugins, viewsBySlot: {} }}
        snapshot={snapshot}
        projectId="project-1"
        sessionId="session-1"
        resolveRendererView={() => null}
        terminalSession={null}
        clearSignal={0}
        activeTerminalPaneId="pane-terminal"
        onSelectStackedChild={() => {}}
      />
    )

    expect(screen.queryByTestId('terminal-view')).not.toBeInTheDocument()
    expect(screen.getAllByText('Workspace content preview')).toHaveLength(5)
  })
})
