import { useCallback, useEffect, useRef } from 'react'
import type { DragEvent } from 'react'
import type { ITheme } from '@xterm/xterm'

const MIN_COLS = 55
const MIN_ROWS = 25

import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { Terminal } from '@xterm/xterm'

import type { PaneViewProps, TerminalThemeName } from '@sessionry/plugin-api'

import '@xterm/xterm/css/xterm.css'

type TerminalPalette = Required<Pick<ITheme,
  'background' | 'foreground' | 'cursor' | 'selectionBackground' |
  'black' | 'brightBlack' | 'red' | 'brightRed' | 'green' | 'brightGreen' |
  'yellow' | 'brightYellow' | 'blue' | 'brightBlue' | 'magenta' | 'brightMagenta' |
  'cyan' | 'brightCyan' | 'white' | 'brightWhite'
>>

const TERMINAL_THEMES: Record<TerminalThemeName, TerminalPalette> = {
  default: {
    background: '#0c0c0e',
    foreground: '#d6e1ff',
    cursor: '#ffcb6b',
    selectionBackground: 'rgba(122, 176, 255, 0.24)',
    black: '#2b3144',
    brightBlack: '#66708f',
    red: '#ff7b72',
    brightRed: '#ffa198',
    green: '#97e98b',
    brightGreen: '#bef5b8',
    yellow: '#ffd866',
    brightYellow: '#ffe38f',
    blue: '#7ab0ff',
    brightBlue: '#a4c8ff',
    magenta: '#d2a8ff',
    brightMagenta: '#e4c7ff',
    cyan: '#7ee7ff',
    brightCyan: '#b4f2ff',
    white: '#d6e1ff',
    brightWhite: '#ffffff'
  },
  dracula: {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    selectionBackground: 'rgba(68, 71, 90, 0.7)',
    black: '#21222c',
    brightBlack: '#6272a4',
    red: '#ff5555',
    brightRed: '#ff6e6e',
    green: '#50fa7b',
    brightGreen: '#69ff94',
    yellow: '#f1fa8c',
    brightYellow: '#ffffa5',
    blue: '#bd93f9',
    brightBlue: '#d6acff',
    magenta: '#ff79c6',
    brightMagenta: '#ff92df',
    cyan: '#8be9fd',
    brightCyan: '#a4ffff',
    white: '#f8f8f2',
    brightWhite: '#ffffff'
  },
  'one-dark': {
    background: '#282c34',
    foreground: '#abb2bf',
    cursor: '#528bff',
    selectionBackground: 'rgba(67, 74, 90, 0.7)',
    black: '#3f4451',
    brightBlack: '#4f5666',
    red: '#e06c75',
    brightRed: '#ff7b86',
    green: '#98c379',
    brightGreen: '#b1e18b',
    yellow: '#e5c07b',
    brightYellow: '#f0cc8e',
    blue: '#61afef',
    brightBlue: '#7ec4ff',
    magenta: '#c678dd',
    brightMagenta: '#de8ff0',
    cyan: '#56b6c2',
    brightCyan: '#6acfd6',
    white: '#abb2bf',
    brightWhite: '#c8cdd5'
  },
  'solarized-dark': {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#839496',
    selectionBackground: 'rgba(7, 54, 66, 0.8)',
    black: '#073642',
    brightBlack: '#002b36',
    red: '#dc322f',
    brightRed: '#cb4b16',
    green: '#859900',
    brightGreen: '#586e75',
    yellow: '#b58900',
    brightYellow: '#657b83',
    blue: '#268bd2',
    brightBlue: '#839496',
    magenta: '#d33682',
    brightMagenta: '#6c71c4',
    cyan: '#2aa198',
    brightCyan: '#93a1a1',
    white: '#eee8d5',
    brightWhite: '#fdf6e3'
  },
  'github-dark': {
    background: '#0d1117',
    foreground: '#e6edf3',
    cursor: '#e6edf3',
    selectionBackground: 'rgba(33, 52, 71, 0.7)',
    black: '#484f58',
    brightBlack: '#6e7681',
    red: '#ff7b72',
    brightRed: '#ffa198',
    green: '#3fb950',
    brightGreen: '#56d364',
    yellow: '#d29922',
    brightYellow: '#e3b341',
    blue: '#58a6ff',
    brightBlue: '#79c0ff',
    magenta: '#bc8cff',
    brightMagenta: '#d2a8ff',
    cyan: '#39c5cf',
    brightCyan: '#56d4dd',
    white: '#b1bac4',
    brightWhite: '#e6edf3'
  }
}

const terminalThemeVariables = {
  background: '--workspace-bg',
  foreground: '--term-fg',
  cursor: '--term-cursor',
  selectionBackground: '--term-selection',
  black: '--term-black',
  brightBlack: '--term-bright-black',
  red: '--term-red',
  brightRed: '--term-bright-red',
  green: '--term-green',
  brightGreen: '--term-bright-green',
  yellow: '--term-yellow',
  brightYellow: '--term-bright-yellow',
  blue: '--term-blue',
  brightBlue: '--term-bright-blue',
  magenta: '--term-magenta',
  brightMagenta: '--term-bright-magenta',
  cyan: '--term-cyan',
  brightCyan: '--term-bright-cyan',
  white: '--term-white',
  brightWhite: '--term-bright-white'
}

type ManagedTerminalTheme = typeof TERMINAL_THEMES.default

const getTerminalTheme = (element: HTMLElement): ITheme => {
  const namedTheme = document.documentElement.getAttribute('data-terminal-theme') as TerminalThemeName | null
  let theme: ITheme
  if (namedTheme && namedTheme !== 'default' && TERMINAL_THEMES[namedTheme]) {
    theme = { ...TERMINAL_THEMES[namedTheme] }
  } else {
    const styles = getComputedStyle(element)
    theme = Object.fromEntries(
      Object.entries(terminalThemeVariables).map(([key, variable]) => {
        const themeKey = key as keyof ManagedTerminalTheme
        const value = styles.getPropertyValue(variable).trim()
        return [key, value || TERMINAL_THEMES.default[themeKey]]
      })
    ) as ITheme
  }
  const bgOverride = getComputedStyle(document.documentElement).getPropertyValue('--terminal-surface-bg').trim()
  if (bgOverride) theme = { ...theme, background: bgOverride }
  return theme
}

export const TerminalPaneView = ({
  workspace,
  pane,
  clearSignal,
  visible = true,
  onRegisterFocusHandler
}: PaneViewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const sizeRef = useRef({ cols: 80, rows: 24 })
  const sessionFolder = workspace.getSession(pane.sessionId)?.data.folder
  const sessionFolderRef = useRef(sessionFolder)
  sessionFolderRef.current = sessionFolder

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    const droppedFiles = Array.from(event.dataTransfer.files)
    const formattedFilePaths = droppedFiles.length > 0
      ? droppedFiles
          .map((file) => window.terminalApp.getPathForDroppedFile(file))
          .filter(Boolean)
          .map((filePath) =>
            window.terminalApp.formatPathForTerminal(filePath, sessionFolderRef.current)
          )
      : []
    const dragText = droppedFiles.length === 0 ? event.dataTransfer.getData('text/plain') : ''
    const input = formattedFilePaths.join(' ') || dragText

    if (!input) return

    terminalRef.current?.focus()
    window.terminalApp.sendTerminalInput({
      sessionId: pane.id,
      data: input
    })
  }, [pane.id])

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return

    const fitAddon = new FitAddon()
    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      scrollback: 10000,
      fontFamily: '"BerkeleyMono Nerd Font Mono Plus Font Awesome Plus Octicons Plus Power Symbols Plus Codicons Plus Pomicons Plus Font Logos Plus Material Design Icons Plus Weather Icons", "SF Mono", "JetBrains Mono", ui-monospace, monospace',
      fontSize: 11,
      lineHeight: 1.15,
      customGlyphs: true,
      theme: getTerminalTheme(containerRef.current)
    })

    terminal.loadAddon(fitAddon)
    terminal.open(containerRef.current)
    terminal.loadAddon(new WebglAddon())
    const applyTerminalTheme = () => {
      if (!containerRef.current) return
      terminal.options.theme = getTerminalTheme(containerRef.current)
      terminal.refresh(0, terminal.rows - 1)
    }

    const currentSession = pane.id
    const resizeTerminal = () => {
      fitAddon.fit()
      const cols = Math.max(terminal.cols, MIN_COLS)
      const rows = Math.max(terminal.rows, MIN_ROWS)
      if (terminal.cols !== cols || terminal.rows !== rows) {
        terminal.resize(cols, rows)
      }
      sizeRef.current = { cols, rows }
      window.terminalApp.resizeTerminal({ sessionId: currentSession, cols, rows })
    }

    const resizeObserver = new ResizeObserver(resizeTerminal)
    resizeObserver.observe(containerRef.current)
    const themeObserver = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.attributeName === 'class' || mutation.attributeName === 'data-terminal-theme')) {
        applyTerminalTheme()
      }
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-terminal-theme']
    })


    // Buffer live data while the historical snapshot is loading to avoid
    // interleaving real-time writes with the bulk buffer replay.
    const pendingData: string[] = []
    let historyLoaded = false

    const unsubscribeData = window.terminalApp.onTerminalData((event) => {
      if (event.sessionId !== currentSession) return
      if (historyLoaded) {
        terminal.write(event.data)
      } else {
        pendingData.push(event.data)
      }
    })
    const terminalInputSubscription = terminal.onData((data) => {
      // xterm.js auto-responds to DA queries (ESC[c, ESC[>c) with DA responses
      // (ESC[?1;2c, ESC[>0;276;0c). When these responses arrive at the PTY
      // after tmux has moved on, tmux forwards them to the inner shell as
      // literal input — appearing as garbage text (e.g. "1;2c0;276;0c").
      // DA responses are machine-generated and never represent user input,
      // so it is safe to suppress them unconditionally.
      if (/^\x1b\[[?<>][\d;]*c$/.test(data)) return
      window.terminalApp.sendTerminalInput({
        sessionId: currentSession,
        data
      })
    })

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon
    
    // Register focus handler with parent component
    onRegisterFocusHandler?.(() => {
      terminal.focus()
    })

    resizeTerminal()
    applyTerminalTheme()

    // Load the historical buffer, then drain any real-time data that arrived
    // while we were waiting. Real-time chunks appended to the buffer after the
    // snapshot are not duplicated because they land in pendingData.
    void window.terminalApp
      .createTerminalSession({
        sessionId: pane.id,
        cwd: sessionFolderRef.current,
        cols: sizeRef.current.cols,
        rows: sizeRef.current.rows
      })
      .then((session) => {
        if (!terminalRef.current) return
        const buf = session.buffer ?? ''
        if (buf) terminal.write(buf)
        for (const data of pendingData) terminal.write(data)
        historyLoaded = true
        pendingData.length = 0
      })

    return () => {
      historyLoaded = true
      pendingData.length = 0
      unsubscribeData()
      terminalInputSubscription.dispose()
      resizeObserver.disconnect()
      themeObserver.disconnect()
      terminal.dispose()
      fitAddon.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [pane.id])

  // Keep the session cwd in sync when the workspace folder changes.
  useEffect(() => {
    if (!visible || !terminalRef.current) return
    void window.terminalApp.createTerminalSession({
      sessionId: pane.id,
      cwd: sessionFolder,
      cols: sizeRef.current.cols,
      rows: sizeRef.current.rows
    })
  }, [pane.id, sessionFolder, visible])

  useEffect(() => {
    if (!terminalRef.current) return
    terminalRef.current.clear()
  }, [clearSignal])

  useEffect(() => {
    if (!visible || !terminalRef.current || !fitAddonRef.current) return

    fitAddonRef.current.fit()
    window.terminalApp.resizeTerminal({
      sessionId: pane.id,
      cols: terminalRef.current.cols,
      rows: terminalRef.current.rows
    })
  }, [pane.id, visible])

  return (
    <div className="terminal-surface" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div ref={containerRef} className="terminal-container" />
    </div>
  )
}
