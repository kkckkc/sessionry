/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  PaneViewProps,
  PluginViewModel,
  WorkspaceApi,
  WorkspaceStateSnapshot
} from '@sessionry/plugin-api';

import { WorkspacePaneTree } from '../src/WorkspacePaneTree';

const paneRendererSpy = vi.fn();

const plugins: PluginViewModel = {
  actions: [],
  toolbarActionIds: [],
  statusItems: [],
  paneCreations: [
    {
      id: 'terminal',
      title: 'Terminal',
      icon: 'TbTerminal',
      order: 10,
      paneType: 'terminal',
      defaultState: { name: 'Terminal', title: 'Terminal' },
      pluginId: 'plugin-default-view-terminal',
      pluginIcon: 'TbTerminal'
    }
  ],
  viewsBySlot: {
    'pane:terminal': [
      {
        id: 'pane.terminal.default',
        title: 'Terminal',
        slot: 'pane:terminal',
        pluginId: 'plugin-default-view-terminal',
        viewMode: 'single-view',
        isDefault: true
      }
    ]
  }
};

const paneRendererRegistration = {
  component: (props: PaneViewProps) => {
    paneRendererSpy(props);
    return (
      <div data-testid="terminal-view">
        <button type="button" data-testid="terminal-focus-target">
          terminal
        </button>
        <span data-testid="terminal-visible">{String(props.visible)}</span>
      </div>
    );
  }
};

const createWorkspaceStub = (overrides: Partial<WorkspaceApi> = {}): WorkspaceApi => ({
  get snapshot() {
    return snapshot;
  },
  projects: [],
  getProject: () => null,
  getSession: () => null,
  getPaneGroup: () => null,
  getPane: () => null,
  subscribe: () => () => {},
  subscribeAll: () => () => {},
  createProject: async () => {
    throw new Error('Not implemented in test');
  },
  ...overrides
});

const snapshot: WorkspaceStateSnapshot = {
  projects: [
    {
      id: 'project-1',
      name: 'Project',
      folder: '/tmp/project',
      metadata: {},
      activeViews: {},
      sessionIds: ['session-1']
    }
  ],
  sessions: [
    {
      id: 'session-1',
      projectId: 'project-1',
      name: 'Session',
      folder: '/tmp/project',
      rootPaneGroupId: 'root'
    }
  ],
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
    {
      id: 'pane-terminal',
      sessionId: 'session-1',
      type: 'terminal',
      preferredSizePct: 50,
      state: { title: 'Terminal' }
    },
    {
      id: 'pane-activity',
      sessionId: 'session-1',
      type: 'activity',
      preferredSizePct: 50,
      state: { title: 'Activity' }
    },
    {
      id: 'pane-outline',
      sessionId: 'session-1',
      type: 'outline',
      preferredSizePct: 45,
      state: { title: 'Outline' }
    },
    {
      id: 'pane-inspector',
      sessionId: 'session-1',
      type: 'inspector',
      preferredSizePct: 60,
      state: { title: 'Inspector' }
    },
    {
      id: 'pane-problems',
      sessionId: 'session-1',
      type: 'problems',
      preferredSizePct: 40,
      state: { title: 'Problems' }
    }
  ],
  activeSessionId: 'session-1'
};

const nestedSplitInTabsSnapshot: WorkspaceStateSnapshot = {
  ...snapshot,
  paneGroups: [
    {
      id: 'root',
      sessionId: 'session-1',
      name: 'Workspace',
      direction: 'horizontal',
      preferredSizePct: 100,
      children: [{ kind: 'group', paneGroupId: 'left-tabs' }]
    },
    {
      id: 'left-tabs',
      sessionId: 'session-1',
      name: 'Editors',
      direction: 'stacked',
      preferredSizePct: 100,
      activeChildId: 'side-column',
      children: [
        { kind: 'pane', paneId: 'pane-terminal' },
        { kind: 'group', paneGroupId: 'side-column' }
      ]
    },
    {
      id: 'side-column',
      sessionId: 'session-1',
      name: 'Side Column',
      direction: 'vertical',
      preferredSizePct: 50,
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
      preferredSizePct: 50,
      activeChildId: 'pane-inspector',
      children: [
        { kind: 'pane', paneId: 'pane-inspector' },
        { kind: 'pane', paneId: 'pane-problems' }
      ]
    }
  ]
};

describe('WorkspacePaneTree', () => {
  it('renders horizontal, vertical, and stacked groups with preferred sizes', () => {
    render(
      <WorkspacePaneTree
        plugins={plugins}
        workspace={createWorkspaceStub()}
        resolveRendererView={() => paneRendererRegistration}
        clearSignal={0}
      />
    );

    expect(screen.getByTestId('group-root').querySelector('.workspace-split')).toHaveClass(
      'is-horizontal'
    );
    expect(screen.getByTestId('group-right-column').querySelector('.workspace-split')).toHaveClass(
      'is-vertical'
    );
    expect(screen.getByRole('tablist', { name: 'Editors tabs' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Inspectors tabs' })).toBeInTheDocument();
    expect(screen.getByTestId('group-left-tabs')).toHaveStyle({ flexBasis: '58%' });
    expect(screen.getByTestId('pane-pane-outline')).toHaveStyle({ flexBasis: '45%' });
    expect(screen.getByTestId('terminal-view')).toBeInTheDocument();
    expect(screen.getByTestId('pane-pane-terminal')).toHaveClass('is-bare');
    expect(screen.getByTestId('pane-pane-terminal').querySelector('.header')).toBeNull();
    expect(screen.getByTestId('pane-pane-outline').querySelector('.header')).toBeNull();
  });

  it('shows dynamic pane creation entries in the stacked pane + menu', async () => {
    render(
      <WorkspacePaneTree
        plugins={plugins}
        workspace={createWorkspaceStub()}
        resolveRendererView={() => paneRendererRegistration}
        resolvePaneCreations={async () => [
          {
            id: 'chat-openai',
            title: 'Chat with OpenAI',
            paneType: 'chat',
            pluginId: 'plugin-default-view-chat',
            defaultState: {
              title: 'Chat with OpenAI',
              providerId: 'openai'
            }
          },
          {
            id: 'chat-anthropic',
            title: 'Chat with Anthropic',
            paneType: 'chat',
            pluginId: 'plugin-default-view-chat',
            defaultState: {
              title: 'Chat with Anthropic',
              providerId: 'anthropic'
            }
          }
        ]}
        clearSignal={0}
      />
    );

    fireEvent.click(screen.getAllByLabelText('New pane')[0]);

    await waitFor(() => {
      expect(screen.getByText('Chat with OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Chat with Anthropic')).toBeInTheDocument();
    });
  });

  it('uses pane names for tabs and pane titles for pane headers', () => {
    const namedSnapshot: WorkspaceStateSnapshot = {
      ...snapshot,
      panes: snapshot.panes.map(pane =>
        pane.id === 'pane-terminal'
          ? {
              ...pane,
              state: {
                ...pane.state,
                name: 'Terminal 1',
                title: 'npm test'
              }
            }
          : pane
      )
    };

    render(
      <WorkspacePaneTree
        plugins={plugins}
        workspace={createWorkspaceStub({
          get snapshot() {
            return namedSnapshot;
          }
        })}
        resolveRendererView={() => paneRendererRegistration}
        clearSignal={0}
      />
    );

    expect(screen.getByRole('tab', { name: /Terminal 1/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /npm test/ })).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'npm test', hidden: true })).toBeInTheDocument();
  });

  it('moves nested split-group actions into the parent tab row and hides the nested header', async () => {
    const Harness = () => {
      const [currentSnapshot, setCurrentSnapshot] = React.useState(nestedSplitInTabsSnapshot);
      const workspace = React.useMemo(
        () =>
          createWorkspaceStub({
            get snapshot() {
              return currentSnapshot;
            },
            getPaneGroup: paneGroupId =>
              ({
                id: paneGroupId,
                data: currentSnapshot.paneGroups.find(paneGroup => paneGroup.id === paneGroupId)!,
                session: null,
                children: [],
                update: async input => {
                  setCurrentSnapshot(value => ({
                    ...value,
                    paneGroups: value.paneGroups.map(paneGroup =>
                      paneGroup.id === paneGroupId ? { ...paneGroup, ...input } : paneGroup
                    )
                  }));
                },
                setChildren: async () => {},
                insertPane: async () => {},
                insertPaneGroup: async () => {},
                moveNode: async () => {},
                removeNode: async () => {},
                remove: async () => {}
              }) as any
          }),
        [currentSnapshot]
      );

      return (
        <WorkspacePaneTree
          plugins={plugins}
          workspace={workspace}
          resolveRendererView={() => paneRendererRegistration}
          clearSignal={0}
        />
      );
    };

    render(<Harness />);

    const leftTabsGroup = screen.getByTestId('group-left-tabs');
    const tabBarActions = leftTabsGroup.querySelector(':scope > .tab-bar-row > .tab-bar-actions');
    const sideColumnGroup = screen.getByTestId('group-side-column');

    expect(tabBarActions).not.toBeNull();
    expect(sideColumnGroup.querySelector(':scope > .header')).toBeNull();
    expect(screen.getByRole('tablist', { name: 'Editors tabs' })).toBeInTheDocument();
    expect(tabBarActions?.querySelector('[aria-label="Close pane group"]')).not.toBeNull();
    expect(
      leftTabsGroup.querySelector(
        ':scope > .tab-bar-row > .tab-bar-actions [aria-label="Split horizontal"]'
      )
    ).not.toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /Terminal/ }));

    await waitFor(() => {
      expect(
        leftTabsGroup.querySelector(
          ':scope > .tab-bar-row > .tab-bar-actions [aria-label="Split horizontal"]'
        )
      ).not.toBeNull();
    });
  });

  it('switches active tab content through the model callback and passes visibility to the pane renderer', () => {
    const Harness = () => {
      const [currentSnapshot, setCurrentSnapshot] = React.useState(snapshot);
      const workspace = React.useMemo(
        () =>
          createWorkspaceStub({
            get snapshot() {
              return currentSnapshot;
            },
            getPaneGroup: paneGroupId =>
              ({
                id: paneGroupId,
                data: currentSnapshot.paneGroups.find(paneGroup => paneGroup.id === paneGroupId)!,
                session: null,
                children: [],
                update: async input => {
                  setCurrentSnapshot(value => ({
                    ...value,
                    paneGroups: value.paneGroups.map(paneGroup =>
                      paneGroup.id === paneGroupId ? { ...paneGroup, ...input } : paneGroup
                    )
                  }));
                },
                setChildren: async () => {},
                insertPane: async () => {},
                insertPaneGroup: async () => {},
                moveNode: async () => {},
                removeNode: async () => {},
                remove: async () => {}
              }) as unknown as PaneGroupHandle
          }),
        [currentSnapshot.paneGroups, currentSnapshot]
      );

      return (
        <WorkspacePaneTree
          plugins={plugins}
          workspace={workspace}
          resolveRendererView={() => paneRendererRegistration}
          clearSignal={0}
        />
      );
    };

    render(<Harness />);

    expect(screen.getByTestId('terminal-view')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-visible')).toHaveTextContent('true');
    expect(
      screen
        .getByRole('article', { name: 'Terminal', hidden: true })
        .closest('.workspace-stacked-panel')
    ).not.toHaveAttribute('hidden');

    fireEvent.click(screen.getByRole('tab', { name: /Activity/ }));

    expect(screen.getByTestId('terminal-view')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-visible')).toHaveTextContent('false');
    expect(
      screen
        .getByRole('article', { name: 'Activity', hidden: true })
        .closest('.workspace-stacked-panel')
    ).not.toHaveAttribute('hidden');
    expect(
      screen
        .getByRole('article', { name: 'Terminal', hidden: true })
        .closest('.workspace-stacked-panel')
    ).toHaveAttribute('hidden');
  });

  it('restores focus to the last focused element when returning to a tab', async () => {
    const Harness = () => {
      const [currentSnapshot, setCurrentSnapshot] = React.useState(snapshot);
      const workspace = React.useMemo(
        () =>
          createWorkspaceStub({
            get snapshot() {
              return currentSnapshot;
            },
            getPaneGroup: paneGroupId =>
              ({
                id: paneGroupId,
                data: currentSnapshot.paneGroups.find(paneGroup => paneGroup.id === paneGroupId)!,
                session: null,
                children: [],
                update: async input => {
                  setCurrentSnapshot(value => ({
                    ...value,
                    paneGroups: value.paneGroups.map(paneGroup =>
                      paneGroup.id === paneGroupId ? { ...paneGroup, ...input } : paneGroup
                    )
                  }));
                },
                setChildren: async () => {},
                insertPane: async () => {},
                insertPaneGroup: async () => {},
                moveNode: async () => {},
                removeNode: async () => {},
                remove: async () => {}
              }) as unknown as PaneGroupHandle
          }),
        [currentSnapshot.paneGroups, currentSnapshot]
      );

      return (
        <WorkspacePaneTree
          plugins={plugins}
          workspace={workspace}
          resolveRendererView={() => paneRendererRegistration}
          clearSignal={0}
        />
      );
    };

    render(<Harness />);

    const terminalFocusTarget = screen.getByTestId('terminal-focus-target');
    terminalFocusTarget.focus();
    expect(document.activeElement).toBe(terminalFocusTarget);

    fireEvent.click(screen.getByRole('tab', { name: /Activity/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Terminal/ }));

    await waitFor(() => {
      expect(document.activeElement).toBe(terminalFocusTarget);
    });
  });

  it('tracks the focused pane on focus events', async () => {
    const setFocusedPane = vi.fn(async () => {});
    const workspace = createWorkspaceStub({
      getSession: sessionId =>
        sessionId === 'session-1'
          ? ({
              id: sessionId,
              data: snapshot.sessions[0]!,
              project: null,
              rootPaneGroup: null,
              activate: async () => {},
              update: async () => {},
              setFocusedPane,
              remove: async () => {},
              setRootPaneGroup: async () => {},
              createPaneGroup: async () => {
                throw new Error('Not implemented in test');
              },
              createPane: async () => {
                throw new Error('Not implemented in test');
              }
            } as any)
          : null
    });

    render(
      <WorkspacePaneTree
        plugins={plugins}
        workspace={workspace}
        resolveRendererView={() => paneRendererRegistration}
        clearSignal={0}
      />
    );

    fireEvent.focus(screen.getByTestId('terminal-focus-target'));

    await waitFor(() => {
      expect(setFocusedPane).toHaveBeenCalledWith('pane-terminal');
    });
  });

  it('initializes a new split at 50/50 when splitting the active pane', async () => {
    const split = vi.fn(async () => ({ id: 'group-created' }));

    const workspace = createWorkspaceStub({
      getPane: paneId =>
        paneId === 'pane-terminal'
          ? ({
              id: paneId,
              split
            } as any)
          : null
    });

    render(
      <WorkspacePaneTree
        plugins={plugins}
        workspace={workspace}
        resolveRendererView={() => paneRendererRegistration}
        clearSignal={0}
      />
    );

    const splitButton = screen
      .getByTestId('pane-pane-terminal')
      .querySelector('button[aria-label="Split horizontal"]') as HTMLButtonElement | null;

    expect(splitButton).not.toBeNull();
    fireEvent.click(splitButton!);

    await waitFor(() => {
      expect(split).toHaveBeenCalledWith('horizontal');
    });
  });

  it('falls back to placeholder content when no pane renderer is registered', () => {
    render(
      <WorkspacePaneTree
        plugins={{ ...plugins, viewsBySlot: {} }}
        workspace={createWorkspaceStub()}
        resolveRendererView={() => null}
        clearSignal={0}
      />
    );

    expect(screen.queryByTestId('terminal-view')).not.toBeInTheDocument();
    expect(screen.getAllByText('Workspace content preview')).toHaveLength(5);
  });
});
