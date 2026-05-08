import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Pane,
  PaneGroup,
  Session,
  WorkspaceApi,
  WorkspaceStateSnapshot
} from '@sessionry/plugin-api';

import { FileBrowserView } from '../src/renderer';

const createWorkspaceStub = () => {
  let snapshot: WorkspaceStateSnapshot = {
    projects: [],
    sessions: [
      {
        id: 'session-1',
        projectId: 'project-1',
        name: 'Session',
        folder: '/tmp/project',
        rootPaneGroupId: 'group-1',
        focusedPaneId: 'pane-terminal'
      }
    ],
    paneGroups: [
      {
        id: 'group-1',
        sessionId: 'session-1',
        name: 'Tabs',
        direction: 'stacked',
        activeChildId: 'pane-terminal',
        children: [{ kind: 'pane', paneId: 'pane-terminal' }]
      }
    ],
    panes: [
      {
        id: 'pane-terminal',
        sessionId: 'session-1',
        type: 'terminal',
        state: { title: 'Terminal' }
      }
    ],
    activeSessionId: 'session-1'
  };
  let nextPaneId = 1;

  const findSession = (sessionId: string): Session =>
    snapshot.sessions.find(session => session.id === sessionId)!;
  const findPaneGroup = (paneGroupId: string): PaneGroup =>
    snapshot.paneGroups.find(paneGroup => paneGroup.id === paneGroupId)!;
  const findPane = (paneId: string): Pane => snapshot.panes.find(pane => pane.id === paneId)!;

  const workspace: WorkspaceApi = {
    get snapshot() {
      return snapshot;
    },
    projects: [],
    getProject: () => null,
    getSession: sessionId =>
      sessionId === 'session-1'
        ? ({
            id: sessionId,
            data: findSession(sessionId),
            project: null,
            rootPaneGroup: null,
            activate: async () => {},
            update: async input => {
              snapshot = {
                ...snapshot,
                sessions: snapshot.sessions.map(session =>
                  session.id === sessionId ? { ...session, ...input } : session
                )
              };
            },
            setFocusedPane: async (paneId?: string) => {
              snapshot = {
                ...snapshot,
                sessions: snapshot.sessions.map(session =>
                  session.id === sessionId ? { ...session, focusedPaneId: paneId } : session
                )
              };
            },
            remove: async () => {},
            setRootPaneGroup: async () => {},
            createPaneGroup: async input => {
              const paneGroup: PaneGroup = {
                id: `group-${snapshot.paneGroups.length + 1}`,
                sessionId,
                name: input.name,
                direction: input.direction,
                preferredSizePct: input.preferredSizePct,
                activeChildId: input.activeChildId,
                children: []
              };
              snapshot = {
                ...snapshot,
                paneGroups: [...snapshot.paneGroups, paneGroup].map(group => {
                  if (group.id !== input.parentPaneGroupId) return group;
                  const children = [...group.children];
                  const index = input.index ?? children.length;
                  children.splice(index, 0, { kind: 'group', paneGroupId: paneGroup.id });
                  return { ...group, children };
                })
              };

              return workspace.getPaneGroup(paneGroup.id)!;
            },
            createPane: async input => {
              const pane: Pane = {
                id: `pane-code-${nextPaneId++}`,
                sessionId,
                type: input.type,
                preferredSizePct: input.preferredSizePct,
                state: input.state ?? {}
              };
              snapshot = {
                ...snapshot,
                panes: [...snapshot.panes, pane],
                paneGroups: snapshot.paneGroups.map(group => {
                  if (group.id !== input.parentPaneGroupId) return group;
                  const children = [...group.children];
                  const index = input.index ?? children.length;
                  children.splice(index, 0, { kind: 'pane', paneId: pane.id });
                  return { ...group, children };
                })
              };
              return workspace.getPane(pane.id)!;
            }
          } as any)
        : null,
    getPaneGroup: paneGroupId =>
      snapshot.paneGroups.some(paneGroup => paneGroup.id === paneGroupId)
        ? ({
            id: paneGroupId,
            data: findPaneGroup(paneGroupId),
            session: null,
            children: [],
            update: async input => {
              snapshot = {
                ...snapshot,
                paneGroups: snapshot.paneGroups.map(paneGroup =>
                  paneGroup.id === paneGroupId ? { ...paneGroup, ...input } : paneGroup
                )
              };
            },
            setChildren: async () => {},
            insertPane: async () => {},
            insertPaneGroup: async () => {},
            moveNode: async (node, index) => {
              const sourcePaneGroup = snapshot.paneGroups.find(paneGroup =>
                paneGroup.children.some(
                  child =>
                    child.kind === node.kind &&
                    (child.kind === 'pane' ? child.paneId : child.paneGroupId) ===
                      (node.kind === 'pane' ? node.paneId : node.paneGroupId)
                )
              );
              snapshot = {
                ...snapshot,
                paneGroups: snapshot.paneGroups.map(paneGroup => {
                  if (paneGroup.id === sourcePaneGroup?.id) {
                    return {
                      ...paneGroup,
                      children: paneGroup.children.filter(
                        child =>
                          !(
                            child.kind === node.kind &&
                            (child.kind === 'pane' ? child.paneId : child.paneGroupId) ===
                              (node.kind === 'pane' ? node.paneId : node.paneGroupId)
                          )
                      )
                    };
                  }
                  if (paneGroup.id === paneGroupId) {
                    const children = [...paneGroup.children];
                    children.splice(index ?? children.length, 0, node);
                    return { ...paneGroup, children };
                  }
                  return paneGroup;
                })
              };
            },
            removeNode: async () => {},
            remove: async () => {}
          } as any)
        : null,
    getPane: paneId =>
      snapshot.panes.some(pane => pane.id === paneId)
        ? ({
            id: paneId,
            data: findPane(paneId),
            session: workspace.getSession(findPane(paneId).sessionId)!,
            split: async () => {
              throw new Error('Not implemented in test');
            },
            convertToTabs: async () => {
              throw new Error('Not implemented in test');
            },
            update: async () => {},
            remove: async () => {}
          } as any)
        : null,
    subscribe: () => () => {},
    subscribeAll: () => () => {},
    createProject: async () => {
      throw new Error('Not implemented in test');
    }
  };

  return {
    workspace,
    readSnapshot: () => snapshot
  };
};

describe('FileBrowserView', () => {
  beforeEach(() => {
    window.terminalApp = {
      openExternal: vi.fn(),
      showFolderDialog: vi.fn(),
      readDirectory: vi.fn(async (dirPath: string) => {
        if (dirPath === '/tmp/project') {
          return [
            { name: 'docs', isDirectory: true },
            { name: 'My File.ts', isDirectory: false }
          ];
        }
        if (dirPath === '/tmp/project/docs') {
          return [{ name: 'Guide.md', isDirectory: false }];
        }
        return [];
      }),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      vcs: {
        getStatus: vi.fn(async () => null)
      },
      getPathForDroppedFile: vi.fn(),
      formatPathForTerminal: vi.fn((targetPath: string) => {
        if (targetPath === '/tmp/project/My File.ts') return "'My File.ts'";
        if (targetPath === '/tmp/project/docs') return 'docs';
        return targetPath;
      }),
      createTerminalSession: vi.fn(),
      sendTerminalInput: vi.fn(),
      resizeTerminal: vi.fn(),
      getPluginModel: vi.fn(),
      getUserPluginRenderers: vi.fn(),
      actions: {
        list: vi.fn(),
        execute: vi.fn()
      },
      workspace: {
        read: vi.fn(),
        executeCommand: vi.fn(),
        onEvent: vi.fn()
      },
      settings: {
        read: vi.fn(),
        update: vi.fn(),
        onChange: vi.fn()
      },
      themes: {
        getTheme: vi.fn(),
        getAllThemes: vi.fn(),
        getThemeIds: vi.fn()
      },
      plugins: {
        search: vi.fn(),
        install: vi.fn(),
        uninstall: vi.fn(),
        update: vi.fn(),
        list: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        checkUpdates: vi.fn(),
        onInstallProgress: vi.fn(() => () => {}),
        onUpdateProgress: vi.fn(() => () => {})
      },
      onTerminalData: vi.fn(),
      onTerminalState: vi.fn(),
      onTerminalExit: vi.fn()
    } as never;
  });

  it('writes shell-safe relative text for dragged files and directories', async () => {
    const { workspace } = createWorkspaceStub();
    render(<FileBrowserView workspace={workspace} />);

    const fileRow = await screen.findByText('My File.ts');
    const directoryRow = await screen.findByText('docs');

    const fileTransfer = {
      effectAllowed: 'none',
      setData: vi.fn()
    };
    fireEvent.dragStart(fileRow.closest('.file-tree-row')!, { dataTransfer: fileTransfer });

    expect(window.terminalApp.formatPathForTerminal).toHaveBeenCalledWith(
      '/tmp/project/My File.ts',
      '/tmp/project'
    );
    expect(fileTransfer.setData).toHaveBeenCalledWith('text/plain', "'My File.ts'");
    expect(fileTransfer.effectAllowed).toBe('copy');

    fireEvent.click(directoryRow.closest('.file-tree-row')!);
    await waitFor(() => {
      expect(window.terminalApp.readDirectory).toHaveBeenCalledWith('/tmp/project/docs');
    });

    const directoryTransfer = {
      effectAllowed: 'none',
      setData: vi.fn()
    };
    fireEvent.dragStart(directoryRow.closest('.file-tree-row')!, {
      dataTransfer: directoryTransfer
    });

    expect(window.terminalApp.formatPathForTerminal).toHaveBeenCalledWith(
      '/tmp/project/docs',
      '/tmp/project'
    );
    expect(directoryTransfer.setData).toHaveBeenCalledWith('text/plain', 'docs');
    expect(directoryTransfer.effectAllowed).toBe('copy');
  });

  it('opens and then reuses a code pane on file double click', async () => {
    const { workspace, readSnapshot } = createWorkspaceStub();
    render(<FileBrowserView workspace={workspace} />);

    const fileRow = await screen.findByText('My File.ts');

    fireEvent.doubleClick(fileRow.closest('.file-tree-row')!);

    await waitFor(() => {
      const snapshot = readSnapshot();
      const codePane = snapshot.panes.find(pane => pane.type === 'code');
      expect(codePane).toBeDefined();
      expect(codePane?.state).toMatchObject({
        title: 'My File.ts',
        filePath: '/tmp/project/My File.ts'
      });
      expect(snapshot.paneGroups[0]?.activeChildId).toBe(codePane?.id);
      expect(snapshot.sessions[0]?.focusedPaneId).toBe(codePane?.id);
    });

    const firstCodePaneId = readSnapshot().panes.find(pane => pane.type === 'code')?.id;

    fireEvent.doubleClick(fileRow.closest('.file-tree-row')!);

    await waitFor(() => {
      const snapshot = readSnapshot();
      expect(snapshot.panes.filter(pane => pane.type === 'code')).toHaveLength(1);
      expect(snapshot.paneGroups[0]?.activeChildId).toBe(firstCodePaneId);
      expect(snapshot.sessions[0]?.focusedPaneId).toBe(firstCodePaneId);
    });
  });
});
