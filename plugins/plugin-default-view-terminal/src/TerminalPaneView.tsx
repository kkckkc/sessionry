import { useEffect, useRef } from 'react'

const MIN_COLS = 55
const MIN_ROWS = 25

import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'

import type { PaneViewProps, TerminalAppBridge } from '@sessionry/plugin-api'

import '@xterm/xterm/css/xterm.css'

declare global {
  interface Window {
    terminalApp: TerminalAppBridge
  }
}

export const TerminalPaneView = ({
  workspace,
  pane,
  clearSignal,
  visible = true
}: PaneViewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const sizeRef = useRef({ cols: 80, rows: 24 })
  const sessionFolder = workspace.getSession(pane.sessionId)?.data.folder
  const sessionFolderRef = useRef(sessionFolder)
  sessionFolderRef.current = sessionFolder

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return

    const fitAddon = new FitAddon()
    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: '"BerkeleyMono Nerd Font Mono Plus Font Awesome Plus Octicons Plus Power Symbols Plus Codicons Plus Pomicons Plus Font Logos Plus Material Design Icons Plus Weather Icons", "SF Mono", "JetBrains Mono", ui-monospace, monospace',
      fontSize: 11,
      lineHeight: 1.15,
      customGlyphs: true,
      theme: {
        background: '#121212',
        foreground: '#d6e1ff',
        cursor: '#ffcb6b',
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
      }
    })

    terminal.loadAddon(fitAddon)
    terminal.open(containerRef.current)

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

    resizeTerminal()

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

  return <div className="terminal-surface" ref={containerRef} />
}
