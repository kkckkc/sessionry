import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PaneViewProps, TerminalSessionInfo, WorkspaceApi } from '@sessionry/plugin-api'

const fitMock = vi.fn()
const clearMock = vi.fn()
const writeMock = vi.fn()
const disposeMock = vi.fn()
const refreshMock = vi.fn()
const focusMock = vi.fn()
const terminalInstances: Array<{ options: { theme?: unknown } }> = []
const mutationObserverInstances: MutationObserverMock[] = []

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
    options: { theme?: unknown }
    loadAddon = vi.fn()
    open = vi.fn()
    write = writeMock
    clear = clearMock
    focus = focusMock
    dispose = disposeMock
    refresh = refreshMock
    resize = vi.fn()
    constructor(options: { theme?: unknown }) {
      this.options = options
      terminalInstances.push(this)
    }
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

class MutationObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
  callback: MutationCallback
  constructor(callback: MutationCallback) {
    this.callback = callback
    mutationObserverInstances.push(this)
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
    refreshMock.mockClear()
    focusMock.mockClear()
    terminalInstances.length = 0
    mutationObserverInstances.length = 0
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    vi.stubGlobal('MutationObserver', MutationObserverMock)
    document.documentElement.className = 'theme-dark'
    document.documentElement.style.setProperty('--workspace-bg', '#0c0c0e')
    document.documentElement.style.setProperty('--term-fg', '#d6e1ff')
    document.documentElement.style.setProperty('--term-cursor', '#ffcb6b')
    document.documentElement.style.setProperty('--term-selection', 'rgba(122, 176, 255, 0.24)')
    document.documentElement.style.setProperty('--term-blue', '#7ab0ff')
    window.terminalApp = {
      showFolderDialog: vi.fn(),
      readDirectory: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      getPathForDroppedFile: vi.fn((file: File) => `/tmp/${file.name}`),
      formatPathForTerminal: vi.fn((targetPath: string, sessionRoot?: string) => {
        if (!sessionRoot) return targetPath
        return targetPath.startsWith(`${sessionRoot}/`)
          ? targetPath.slice(sessionRoot.length + 1)
          : targetPath
      }),
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
      themes: {
        getTheme: vi.fn(),
        getAllThemes: vi.fn(),
        getThemeIds: vi.fn()
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

  it('sends internal dragged text to the terminal input without executing it', async () => {
    const { container } = render(<TerminalPaneView {...baseProps} visible />)
    await act(async () => {})

    const surface = container.querySelector('.terminal-surface')
    expect(surface).not.toBeNull()

    const dataTransfer = {
      dropEffect: 'none',
      files: [],
      getData: vi.fn((type: string) => (type === 'text/plain' ? "'src/My File.ts'" : ''))
    }

    fireEvent.dragOver(surface!, { dataTransfer })
    expect(dataTransfer.dropEffect).toBe('copy')

    fireEvent.drop(surface!, { dataTransfer })

    expect(focusMock).toHaveBeenCalled()
    expect(window.terminalApp.sendTerminalInput).toHaveBeenCalledWith({
      sessionId: 'pane-terminal',
      data: "'src/My File.ts'"
    })
    expect(window.terminalApp.getPathForDroppedFile).not.toHaveBeenCalled()
  })

  it('formats external dropped files relative to the session root before sending them to the terminal', async () => {
    const { container } = render(<TerminalPaneView {...baseProps} visible />)
    await act(async () => {})

    const surface = container.querySelector('.terminal-surface')
    expect(surface).not.toBeNull()

    const files = [new File(['alpha'], 'My File.txt'), new File(['beta'], 'Outside.txt')]
    window.terminalApp.getPathForDroppedFile = vi
      .fn()
      .mockReturnValueOnce('/tmp/project/My File.txt')
      .mockReturnValueOnce('/tmp/Outside.txt')
    window.terminalApp.formatPathForTerminal = vi
      .fn()
      .mockReturnValueOnce("'My File.txt'")
      .mockReturnValueOnce("'/tmp/Outside.txt'")

    fireEvent.drop(surface!, {
      dataTransfer: {
        files,
        getData: vi.fn(() => '')
      }
    })

    expect(window.terminalApp.getPathForDroppedFile).toHaveBeenNthCalledWith(1, files[0])
    expect(window.terminalApp.getPathForDroppedFile).toHaveBeenNthCalledWith(2, files[1])
    expect(window.terminalApp.formatPathForTerminal).toHaveBeenNthCalledWith(1, '/tmp/project/My File.txt', '/tmp/project')
    expect(window.terminalApp.formatPathForTerminal).toHaveBeenNthCalledWith(2, '/tmp/Outside.txt', '/tmp/project')
    expect(window.terminalApp.sendTerminalInput).toHaveBeenCalledWith({
      sessionId: 'pane-terminal',
      data: "'My File.txt' '/tmp/Outside.txt'"
    })
  })

  it('ignores drops that do not produce any text input', async () => {
    const { container } = render(<TerminalPaneView {...baseProps} visible />)
    await act(async () => {})

    const surface = container.querySelector('.terminal-surface')
    expect(surface).not.toBeNull()

    window.terminalApp.getPathForDroppedFile = vi.fn(() => '')

    fireEvent.drop(surface!, {
      dataTransfer: {
        files: [new File(['alpha'], 'ignored.txt')],
        getData: vi.fn(() => '')
      }
    })

    expect(window.terminalApp.sendTerminalInput).not.toHaveBeenCalled()
  })

  it('updates the mounted terminal theme when the app theme class changes', async () => {
    render(<TerminalPaneView {...baseProps} visible />)
    await act(async () => {})

    const terminal = terminalInstances[0]
    expect(terminal?.options.theme).toMatchObject({
      background: '#0c0c0e',
      foreground: '#d6e1ff'
    })

    document.documentElement.classList.remove('theme-dark')
    document.documentElement.classList.add('theme-light')
    document.documentElement.style.setProperty('--workspace-bg', '#fafafa')
    document.documentElement.style.setProperty('--term-fg', '#1f2937')
    document.documentElement.style.setProperty('--term-blue', '#1d4ed8')

    const observer = mutationObserverInstances[0]
    observer.callback([{ attributeName: 'class' } as MutationRecord], observer as unknown as MutationObserver)

    expect(terminal?.options.theme).toMatchObject({
      background: '#fafafa',
      foreground: '#1f2937',
      blue: '#1d4ed8'
    })
    expect(refreshMock).toHaveBeenCalledWith(0, 23)
  })
})
