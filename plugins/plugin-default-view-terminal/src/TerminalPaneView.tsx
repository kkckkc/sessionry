import { useCallback, useEffect, useRef } from 'react';
import type { DragEvent } from 'react';
import type { ITheme } from '@xterm/xterm';

const MIN_COLS = 55;
const MIN_ROWS = 25;


import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal } from '@xterm/xterm';

import type { PaneViewProps } from '@sessionry/plugin-api';

import '@xterm/xterm/css/xterm.css';

// TERMINAL_THEMES removed - now fetched from theme registry via IPC

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
};

/**
 * Gets terminal theme from the theme registry.
 * Falls back to CSS variables if theme not found.
 */
const getTerminalTheme = async (): Promise<ITheme> => {
  const themeId = document.documentElement.getAttribute('data-theme') || 'default';

  // Fetch theme from registry
  const theme = await window.terminalApp.themes.getTheme(themeId);

  if (theme) {
    const xtermTheme: ITheme = { ...theme.ansi };

    // Apply background override if set
    const bgOverride = getComputedStyle(document.documentElement)
      .getPropertyValue('--terminal-surface-bg')
      .trim();
    if (bgOverride) {
      xtermTheme.background = bgOverride;
    }

    return xtermTheme;
  }

  // Fallback to CSS variables if theme not found
  console.warn(`[Terminal] Theme "${themeId}" not found, falling back to CSS variables`);
  const styles = getComputedStyle(document.documentElement);
  const fallbackTheme: ITheme = Object.fromEntries(
    Object.entries(terminalThemeVariables).map(([key, variable]) => {
      const value = styles.getPropertyValue(variable).trim();
      return [key, value || ''];
    })
  ) as ITheme;

  return fallbackTheme;
};

export const TerminalPaneView = ({
  workspace,
  pane,
  clearSignal: _clearSignal,
  visible = true,
  onRegisterFocusHandler
}: PaneViewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sizeRef = useRef({ cols: 80, rows: 24 });
  const sessionFolder = workspace.getSession(pane.sessionId)?.data.folder;
  const sessionFolderRef = useRef(sessionFolder);
  sessionFolderRef.current = sessionFolder;

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const droppedFiles = Array.from(event.dataTransfer.files);
      const formattedFilePaths =
        droppedFiles.length > 0
          ? droppedFiles
              .map(file => window.terminalApp.getPathForDroppedFile(file))
              .filter(Boolean)
              .map(filePath =>
                window.terminalApp.formatPathForTerminal(filePath, sessionFolderRef.current)
              )
          : [];
      const dragText = droppedFiles.length === 0 ? event.dataTransfer.getData('text/plain') : '';
      const input = formattedFilePaths.join(' ') || dragText;

      if (!input) return;

      terminalRef.current?.focus();
      window.terminalApp.sendTerminalInput({
        sessionId: pane.id,
        data: input
      });
    },
    [pane.id]
  );

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const fitAddon = new FitAddon();
    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      scrollback: 10000,
      fontFamily:
        '"BerkeleyMono Nerd Font Mono Plus Font Awesome Plus Octicons Plus Power Symbols Plus Codicons Plus Pomicons Plus Font Logos Plus Material Design Icons Plus Weather Icons", "SF Mono", "JetBrains Mono", ui-monospace, monospace',
      fontSize: 11,
      lineHeight: 1.15,
      customGlyphs: true
    });

    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (event.type !== 'keydown') return true;
      // Cmd+C on macOS: copy selection (don't send to PTY)
      if (event.metaKey && event.key === 'c') {
        const selection = terminal.getSelection();
        if (selection) {
          void window.terminalApp.clipboard.writeText(selection);
          return false;
        }
        return true; // no selection → let Ctrl+C / SIGINT fall through normally
      }
      // Cmd+V on macOS: paste from clipboard
      if (event.metaKey && event.key === 'v') {
        void window.terminalApp.clipboard.readText().then((text: string) => {
          if (text) {
            window.terminalApp.sendTerminalInput({ sessionId: currentSession, data: text });
          }
        });
        return false;
      }
      // Cmd+Left/Right: beginning/end of line
      if (event.metaKey && event.key === 'ArrowLeft') {
        window.terminalApp.sendTerminalInput({ sessionId: currentSession, data: '\x01' });
        return false;
      }
      if (event.metaKey && event.key === 'ArrowRight') {
        window.terminalApp.sendTerminalInput({ sessionId: currentSession, data: '\x05' });
        return false;
      }
      // Option+Left/Right: word backward/forward
      if (event.altKey && event.key === 'ArrowLeft') {
        window.terminalApp.sendTerminalInput({ sessionId: currentSession, data: '\x1bb' });
        return false;
      }
      if (event.altKey && event.key === 'ArrowRight') {
        window.terminalApp.sendTerminalInput({ sessionId: currentSession, data: '\x1bf' });
        return false;
      }
      // Re-dispatch to document so the app's window-level shortcut handler can fire.
      // Cmd+key combos have no PTY meaning on macOS, so suppress them in xterm.
      // Ctrl+key combos are passed through to xterm as well (terminal control chars).
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: event.key,
        code: event.code,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        bubbles: true,
      }));
      if (event.metaKey) return false;
      return true;
    });
    terminal.loadAddon(new WebglAddon());

    const applyTerminalTheme = async () => {
      const theme = await getTerminalTheme();
      terminal.options.theme = theme;
      terminal.refresh(0, terminal.rows - 1);

      // Update CSS custom property for terminal surface background
      if (containerRef.current?.parentElement && theme.background) {
        containerRef.current.parentElement.style.setProperty('--term-bg', theme.background);
      }
    };

    // Apply initial theme
    void applyTerminalTheme();

    const currentSession = pane.id;
    const resizeTerminal = () => {
      fitAddon.fit();
      const cols = Math.max(terminal.cols, MIN_COLS);
      const rows = Math.max(terminal.rows, MIN_ROWS);
      if (terminal.cols !== cols || terminal.rows !== rows) {
        terminal.resize(cols, rows);
      }
      sizeRef.current = { cols, rows };
      window.terminalApp.resizeTerminal({ sessionId: currentSession, cols, rows });
    };

    const resizeObserver = new ResizeObserver(resizeTerminal);
    resizeObserver.observe(containerRef.current);
    const themeObserver = new MutationObserver(mutations => {
      if (
        mutations.some(
          mutation => mutation.attributeName === 'class' || mutation.attributeName === 'data-theme'
        )
      ) {
        void applyTerminalTheme();
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });

    // Buffer live data while the historical snapshot is loading to avoid
    // interleaving real-time writes with the bulk buffer replay.
    const pendingData: string[] = [];
    let historyLoaded = false;

    const unsubscribeData = window.terminalApp.onTerminalData(event => {
      if (event.sessionId !== currentSession) return;
      if (historyLoaded) {
        terminal.write(event.data);
      } else {
        pendingData.push(event.data);
      }
    });
    const terminalInputSubscription = terminal.onData(data => {
      // xterm.js auto-responds to DA queries (ESC[c, ESC[>c) with DA responses
      // (ESC[?1;2c, ESC[>0;276;0c). When these responses arrive at the PTY
      // after tmux has moved on, tmux forwards them to the inner shell as
      // literal input — appearing as garbage text (e.g. "1;2c0;276;0c").
      // DA responses are machine-generated and never represent user input,
      // so it is safe to suppress them unconditionally.
      if (/^\x1b\[[?<>][\d;]*c$/.test(data)) return;
      window.terminalApp.sendTerminalInput({
        sessionId: currentSession,
        data
      });
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Register focus handler with parent component
    onRegisterFocusHandler?.(() => {
      terminal.focus();
    });

    resizeTerminal();
    applyTerminalTheme();

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
      .then(session => {
        if (!terminalRef.current) return;
        const buf = session.buffer ?? '';
        if (buf) terminal.write(buf);
        for (const data of pendingData) terminal.write(data);
        historyLoaded = true;
        pendingData.length = 0;
      });

    return () => {
      historyLoaded = true;
      pendingData.length = 0;
      unsubscribeData();
      terminalInputSubscription.dispose();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      terminal.dispose();
      fitAddon.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [
    pane.id, // Register focus handler with parent component
    onRegisterFocusHandler
  ]);

  // Keep the session cwd in sync when the workspace folder changes.
  useEffect(() => {
    if (!visible || !terminalRef.current) return;
    void window.terminalApp.createTerminalSession({
      sessionId: pane.id,
      cwd: sessionFolder,
      cols: sizeRef.current.cols,
      rows: sizeRef.current.rows
    });
  }, [pane.id, sessionFolder, visible]);

  useEffect(() => {
    if (!terminalRef.current) return;
    terminalRef.current.clear();
  }, []);

  useEffect(() => {
    if (!visible || !terminalRef.current || !fitAddonRef.current) return;

    fitAddonRef.current.fit();
    window.terminalApp.resizeTerminal({
      sessionId: pane.id,
      cols: terminalRef.current.cols,
      rows: terminalRef.current.rows
    });
  }, [pane.id, visible]);

  return (
    <div className="terminal-surface" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div ref={containerRef} className="terminal-container" />
    </div>
  );
};
