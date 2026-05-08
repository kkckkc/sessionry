import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PluginViewModel, WorkspaceApi, WorkspaceStateSnapshot } from '@sessionry/plugin-api';
import { createMockTerminalApp } from '../../../packages/app/src/renderer/test-utils/mockTerminalApp';

import projectSessionsSidebarRendererPlugin from '../src/renderer';

const plugins: PluginViewModel = {
  actions: [],
  toolbarActionIds: [],
  statusItems: [],
  viewsBySlot: {}
};

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
    {
      id: 'session-1',
      projectId: 'project-1',
      name: 'First',
      folder: '/tmp/alpha',
      rootPaneGroupId: 'group-1'
    },
    {
      id: 'session-2',
      projectId: 'project-1',
      name: 'Second',
      folder: '/tmp/alpha',
      rootPaneGroupId: 'group-2'
    }
  ],
  paneGroups: [],
  panes: [],
  activeSessionId: 'session-2'
};

describe('ProjectSessionsSidebarView', () => {
  it('renders project sessions, shows git diff stats, and activates the clicked session', async () => {
    window.terminalApp = createMockTerminalApp({
      vcs: {
        getStatus: vi.fn(async (folder: string) =>
          folder === '/tmp/alpha'
            ? {
                providerId: 'git',
                providerName: 'Git',
                stats: { filesChanged: 1, insertions: 12, deletions: 3 }
              }
            : null
        )
      },
      settings: {
        read: vi.fn(async () => ({
          confirmations: {
            confirmSessionClose: true
          }
        }))
      }
    });

    const activate = vi.fn(async () => {});
    const getSession = vi.fn((id: string) =>
      id === 'session-1' || id === 'session-2'
        ? ({
            id,
            data: snapshot.sessions.find(session => session.id === id)!,
            project: null,
            rootPaneGroup: null,
            activate,
            update: async () => {},
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
    );
    const workspace: WorkspaceApi = {
      get snapshot() {
        return snapshot;
      },
      projects: [],
      getProject: () => null,
      getSession,
      getPaneGroup: () => null,
      getPane: () => null,
      subscribe: () => () => {},
      subscribeAll: () => () => {},
      createProject: async () => {
        throw new Error('Not implemented in test');
      }
    };
    const Component = projectSessionsSidebarRendererPlugin.views?.[0]?.component;

    if (!Component) {
      throw new Error('Expected project sessions sidebar renderer to register a component.');
    }

    render(<Component plugins={plugins} workspace={workspace} resolveRendererView={() => null} />);

    expect(screen.getByRole('button', { name: 'Second' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findAllByText('+12')).toHaveLength(2);
    expect(screen.getAllByText('-3')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'First' }));

    expect(getSession).toHaveBeenCalledWith('session-1');
    expect(activate).toHaveBeenCalled();
    expect(window.terminalApp.vcs.getStatus).toHaveBeenCalledWith('/tmp/alpha');
  });
});
