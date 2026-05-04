import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PaneViewProps, WorkspaceApi } from '@sessionry/plugin-api'
import { CodePaneView } from '@sessionry/plugin-default-view-code/renderer'

const workspace: WorkspaceApi = {
  get snapshot() {
    return {
      projects: [],
      sessions: [{ id: 'session-1', projectId: 'project-1', name: 'Session', folder: '/tmp/project', rootPaneGroupId: 'group-1' }],
      paneGroups: [],
      panes: []
    }
  },
  projects: [],
  getProject: () => null,
  getSession: () => null,
  getPaneGroup: () => null,
  getPane: () => null,
  subscribe: () => () => {},
  subscribeAll: () => () => {},
  createProject: async () => {
    throw new Error('Not implemented in test')
  }
}

const baseProps: PaneViewProps = {
  plugins: {
    actions: [],
    toolbarActionIds: [],
    statusItems: [],
    viewsBySlot: {}
  },
  workspace,
  resolveRendererView: () => null,
  pane: {
    id: 'pane-code',
    sessionId: 'session-1',
    type: 'code',
    state: {
      filePath: '/tmp/project/src/index.ts',
      title: 'index.ts'
    }
  },
  clearSignal: 0,
  visible: true
}

const getEditorView = (): {
  state: { doc: { length: number } }
  dispatch: (spec: { changes: { from: number; to: number; insert: string } }) => void
} => {
  const editorHost = document.querySelector('.code-pane-editor')
  if (!(editorHost instanceof HTMLDivElement)) {
    throw new Error('Editor host not found')
  }

  const view = (editorHost as HTMLDivElement & {
    __codePaneEditorView?: {
      state: { doc: { length: number } }
      dispatch: (spec: { changes: { from: number; to: number; insert: string } }) => void
    }
  }).__codePaneEditorView

  if (!view) {
    throw new Error('EditorView instance not found')
  }

  return view
}

const getEditorHost = (): HTMLDivElement & {
  __codePaneSave?: () => Promise<void>
} => {
  const editorHost = document.querySelector('.code-pane-editor')
  if (!(editorHost instanceof HTMLDivElement)) {
    throw new Error('Editor host not found')
  }

  return editorHost as HTMLDivElement & { __codePaneSave?: () => Promise<void> }
}

describe('CodePaneView', () => {
  beforeEach(() => {
    if (!Range.prototype.getClientRects) {
      Range.prototype.getClientRects = () => ({
        length: 0,
        item: () => null,
        [Symbol.iterator]: function* iterator() {}
      }) as DOMRectList
    }

    if (!Range.prototype.getBoundingClientRect) {
      Range.prototype.getBoundingClientRect = () =>
        ({
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          toJSON: () => ({})
        }) as DOMRect
    }

    window.terminalApp = {
      showFolderDialog: vi.fn(),
      readDirectory: vi.fn(),
      readFile: vi.fn().mockResolvedValue('export const value = 1\n'),
      writeFile: vi.fn().mockResolvedValue(undefined),
      vcs: {
        getStatus: vi.fn(async () => null)
      },
      getPathForDroppedFile: vi.fn(),
      formatPathForTerminal: vi.fn((targetPath: string) => targetPath),
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
        onChange: vi.fn(() => () => {})
      },
      themes: {
        getTheme: vi.fn(async () => undefined),
        getAllThemes: vi.fn(async () => []),
        getThemeIds: vi.fn(async () => [])
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
    } as never
  })

  it('loads file content and renders the editor', async () => {
    render(<CodePaneView {...baseProps} />)

    await waitFor(() => {
      expect(window.terminalApp.readFile).toHaveBeenCalledWith('/tmp/project/src/index.ts')
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })
  })

  it('marks the editor dirty and saves through the bridge', async () => {
    render(<CodePaneView {...baseProps} />)

    await waitFor(() => {
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    const view = getEditorView()
    await act(async () => {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: 'export const value = 2\n'
        }
      })
    })

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

    await act(async () => {
      await getEditorHost().__codePaneSave?.()
    })

    await waitFor(() => {
      expect(window.terminalApp.writeFile).toHaveBeenCalledWith(
        '/tmp/project/src/index.ts',
        'export const value = 2\n'
      )
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
    })
  })

  it('shows a read error when loading fails', async () => {
    window.terminalApp.readFile = vi.fn().mockRejectedValue(new Error('missing file'))

    render(<CodePaneView {...baseProps} />)

    expect(await screen.findByText('missing file')).toBeInTheDocument()
  })

  it('preserves dirty state and shows an error when save fails', async () => {
    window.terminalApp.writeFile = vi.fn().mockRejectedValue(new Error('permission denied'))

    render(<CodePaneView {...baseProps} />)

    await waitFor(() => {
      expect(document.querySelector('.cm-editor')).toBeInTheDocument()
    })

    const view = getEditorView()
    await act(async () => {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: 'export const value = 3\n'
        }
      })
    })

    await act(async () => {
      await getEditorHost().__codePaneSave?.()
    })

    expect(await screen.findByText('permission denied')).toBeInTheDocument()
    expect(window.terminalApp.writeFile).toHaveBeenCalledWith(
      '/tmp/project/src/index.ts',
      'export const value = 3\n'
    )
  })
})
