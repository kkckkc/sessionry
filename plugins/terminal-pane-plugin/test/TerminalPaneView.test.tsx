import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PaneViewProps } from '@sessionry/plugin-api'

const fitMock = vi.fn()
const clearMock = vi.fn()
const writeMock = vi.fn()
const disposeMock = vi.fn()

const onDataCallbacks: Array<(data: string) => void> = []

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

const baseProps: PaneViewProps = {
  pane: { id: 'pane-terminal', sessionId: 'session-1', type: 'terminal', state: {} },
  snapshot: { projects: [], sessions: [], paneGroups: [], panes: [] },
  projectId: 'project-1',
  sessionId: 'session-1',
  terminalSession: {
    id: 'terminal-session',
    shell: '/bin/zsh',
    cwd: '/tmp',
    pid: 42,
    state: 'ready'
  },
  clearSignal: 0,
  activeTerminalPaneId: 'pane-terminal',
  visible: true
}

describe('TerminalPaneView', () => {
  beforeEach(() => {
    onDataCallbacks.length = 0
    fitMock.mockClear()
    clearMock.mockClear()
    writeMock.mockClear()
    disposeMock.mockClear()
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    window.terminalApp = {
      createTerminalSession: vi.fn(),
      sendTerminalInput: vi.fn(),
      resizeTerminal: vi.fn(),
      getPluginModel: vi.fn(),
      getUserPluginRenderers: vi.fn(),
      workspace: {
        read: vi.fn(),
        executeCommand: vi.fn(),
        onEvent: vi.fn()
      },
      onTerminalData: vi.fn(() => () => {}),
      onTerminalState: vi.fn(() => () => {}),
      onTerminalExit: vi.fn(() => () => {})
    }
  })

  it('clears the terminal and resizes when becoming visible', () => {
    const { rerender } = render(<TerminalPaneView {...baseProps} visible={false} />)

    expect(window.terminalApp.resizeTerminal).toHaveBeenCalledWith({
      sessionId: 'terminal-session',
      cols: 80,
      rows: 24
    })

    rerender(<TerminalPaneView {...baseProps} clearSignal={1} visible />)

    expect(clearMock).toHaveBeenCalledTimes(2)
    expect(fitMock).toHaveBeenCalled()
    expect(window.terminalApp.resizeTerminal).toHaveBeenLastCalledWith({
      sessionId: 'terminal-session',
      cols: 80,
      rows: 24
    })
  })
})
