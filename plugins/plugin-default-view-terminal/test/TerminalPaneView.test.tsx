import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PaneViewProps, TerminalSessionInfo, WorkspaceApi } from '@sessionry/plugin-api'

const fitMock = vi.fn()
const clearMock = vi.fn()
const writeMock = vi.fn()
const disposeMock = vi.fn()

const onDataCallbacks: Array<(data: string) => void> = []
const onTerminalDataCallbacks: Array<(event: { sessionId: string; data: string }) => void> = []

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = fitMock
    dispose = vi.fn()
  }
}))

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80
    rows = 24
    loadAddon = vi.fn()
    open = vi.fn()
    write = writeMock
    clear = clearMock
    dispose = disposeMock
    resize = vi.fn()
    onData(callback: (data: string) => void) {
      onDataCallbacks.push(callback)
      return { dispose: vi.fn() }
    }
  }
}))

import { TerminalPaneView } from '../src/TerminalPaneView'

class ResizeObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
  callback: () => void
  constructor(callback: () => void) {
    this.callback = callback
  }
}

const makeSession = (buffer = ''): TerminalSessionInfo => ({
  id: 'pane-terminal',
  shell: '/bin/zsh',
  cwd: '/tmp',
  pid: 42,
  state: 'ready',
  buffer
})

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
  getSession: (id) =>
    id === 'session-1'
      ? ({
          id,
          data: { id: 'session-1', projectId: 'project-1', name: 'Session', folder: '/tmp/project', rootPaneGroupId: 'group-1' },
          project: null,
          rootPaneGroup: null,
          activate: async () => {},
          update: async () => {},
          remove: async () => {},
          setRootPaneGroup: async () => {},
          createPaneGroup: async () => {
            throw new Error('Not implemented in test')
          },
          createPane: async () => {
            throw new Error('Not implemented in test')
          }
        } as any)
      : null,
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
  pane: { id: 'pane-terminal', sessionId: 'session-1', type: 'terminal', state: {} },
  clearSignal: 0,
  visible: true
}

describe('TerminalPaneView', () => {
  beforeEach(() => {
    onDataCallbacks.length = 0
    onTerminalDataCallbacks.length = 0
    fitMock.mockClear()
    clearMock.mockClear()
    writeMock.mockClear()
    disposeMock.mockClear()
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    window.terminalApp = {
      showFolderDialog: vi.fn(),
      createTerminalSession: vi.fn().mockResolvedValue(makeSession('hello')),
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
      onTerminalData: vi.fn((callback) => {
        onTerminalDataCallbacks.push(callback)
        return () => {}
      }),
      onTerminalState: vi.fn(() => () => {}),
      onTerminalExit: vi.fn(() => () => {})
    }
  })

  it('writes the historical buffer from createTerminalSession on mount', async () => {
    render(<TerminalPaneView {...baseProps} visible={false} />)

    expect(window.terminalApp.createTerminalSession).toHaveBeenCalledWith({
      sessionId: 'pane-terminal',
      cwd: '/tmp/project',
      cols: 80,
      rows: 25
    })

    await act(async () => {})

    expect(writeMock).toHaveBeenCalledWith('hello')
  })

  it('clears on demand and resizes when becoming visible', async () => {
    const { rerender } = render(<TerminalPaneView {...baseProps} visible={false} />)

    await act(async () => {})

    rerender(<TerminalPaneView {...baseProps} clearSignal={1} visible />)

    expect(clearMock).toHaveBeenCalled()
    expect(fitMock).toHaveBeenCalled()
    expect(window.terminalApp.createTerminalSession).toHaveBeenCalledWith({
      sessionId: 'pane-terminal',
      cwd: '/tmp/project',
      cols: 80,
      rows: 25
    })
    expect(window.terminalApp.resizeTerminal).toHaveBeenCalledWith({
      sessionId: 'pane-terminal',
      cols: 80,
      rows: 25
    })
  })

  it('buffers live data arriving during history load and drains it in order without duplication', async () => {
    // Collect resolve functions from each call; effect 1 creates the real session,
    // effect 2 (cwd sync) makes a second call whose result is discarded.
    const resolves: Array<(session: TerminalSessionInfo) => void> = []
    window.terminalApp.createTerminalSession = vi.fn(
      () => new Promise<TerminalSessionInfo>((resolve) => { resolves.push(resolve) })
    )

    render(<TerminalPaneView {...baseProps} visible />)

    // Both effect 1 (buffer load) and effect 2 (cwd sync) call createTerminalSession.
    expect(window.terminalApp.createTerminalSession).toHaveBeenCalled()
    expect(onTerminalDataCallbacks).toHaveLength(1)

    // Live data arrives before history resolves — must be buffered, not written yet
    onTerminalDataCallbacks[0]?.({ sessionId: 'pane-terminal', data: ' world' })
    expect(writeMock).not.toHaveBeenCalled()

    // Resolve effect 1's promise (the first call) and flush microtasks
    resolves[0]?.(makeSession('hello'))
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    // History written first, then the buffered live chunk — no duplicates
    const writes = writeMock.mock.calls.map(([v]) => v as string)
    expect(writes).toEqual(['hello', ' world'])
  })

  it('ignores live data for a different session', async () => {
    render(<TerminalPaneView {...baseProps} visible />)
    await act(async () => {})

    writeMock.mockClear()
    onTerminalDataCallbacks[0]?.({ sessionId: 'other-pane', data: 'noise' })

    expect(writeMock).not.toHaveBeenCalled()
  })
})
