import { useEffect, useRef } from 'react'

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
  pane,
  terminalSession,
  clearSignal,
  visible = true
}: PaneViewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return

    const fitAddon = new FitAddon()
    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: '"SF Mono", "JetBrains Mono", ui-monospace, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      theme: {
        background: '#0b1020',
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
    fitAddon.fit()

    const currentSession = pane.id

    if (terminalSession?.buffer) {
      terminal.write(terminalSession.buffer)
    }

    terminal.onData((data) => {
      window.terminalApp.sendTerminalInput({
        sessionId: currentSession,
        data
      })
    })

    const handleResize = () => {
      fitAddon.fit()
      window.terminalApp.resizeTerminal({
        sessionId: currentSession,
        cols: terminal.cols,
        rows: terminal.rows
      })
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    const unsubscribeData = window.terminalApp.onTerminalData((event) => {
      if (event.sessionId === currentSession) {
        terminal.write(event.data)
      }
    })

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    handleResize()

    return () => {
      unsubscribeData()
      resizeObserver.disconnect()
      terminal.dispose()
      fitAddon.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [pane.id, terminalSession?.buffer])

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
