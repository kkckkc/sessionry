import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

import { spawn, type IPty } from 'node-pty'

import type {
  CreateTerminalSessionInput,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalSessionInfo,
  TerminalStateEvent
} from '@sessionry/plugin-api'

import type { TmuxSettings } from './settingsStore'

const DEFAULT_PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
const EXECUTABLE_MODE = 0o755
const TMUX_SOCKET = 'sessionry'
const require = createRequire(import.meta.url)

interface ManagedTerminalSession {
  pty?: IPty
  state: TerminalSessionInfo
  size?: {
    cols: number
    rows: number
  }
  isTmuxBacked: boolean
}

const isExecutable = (candidate: string | null | undefined): candidate is string => {
  if (!candidate) return false

  try {
    fs.accessSync(candidate, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

const resolveShellCandidates = (): string[] => {
  if (process.platform === 'win32') {
    return [process.env.COMSPEC, 'powershell.exe', 'cmd.exe'].filter((value): value is string => Boolean(value))
  }

  const candidates = [process.env.SHELL, os.userInfo().shell, '/bin/zsh', '/bin/bash', '/bin/sh']
  return [...new Set(candidates.filter(isExecutable))]
}

const ensureNodePtyHelpersExecutable = (): void => {
  try {
    const packageJsonPath = require.resolve('node-pty/package.json')
    const packageDir = path.dirname(packageJsonPath)
    const prebuildsDir = path.join(packageDir, 'prebuilds')

    if (!fs.existsSync(prebuildsDir)) return

    for (const platformDir of fs.readdirSync(prebuildsDir)) {
      const helperPath = path.join(prebuildsDir, platformDir, 'spawn-helper')
      if (!fs.existsSync(helperPath)) continue

      const stats = fs.statSync(helperPath)
      const currentMode = stats.mode & 0o777
      if (currentMode !== EXECUTABLE_MODE) {
        fs.chmodSync(helperPath, EXECUTABLE_MODE)
      }
    }
  } catch (error) {
    console.warn('[sessionry] Unable to repair node-pty spawn-helper permissions.', error)
  }
}

const shellArgs = (shell: string): string[] => {
  if (process.platform === 'win32') return []

  const shellName = path.basename(shell)
  if (shellName === 'zsh' || shellName === 'bash') return ['-il']
  if (shellName === 'sh') return ['-i']
  return []
}

const detectTmux = (): string | null => {
  if (process.platform === 'win32') return null

  const candidates = [
    process.env.TMUX_BIN,
    '/opt/homebrew/bin/tmux',
    '/usr/local/bin/tmux',
    '/usr/bin/tmux',
    'tmux'
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['-V'], { encoding: 'utf8', timeout: 2000 })
    if (result.status === 0) return candidate
  }
  return null
}

const toTmuxName = (paneId: string): string =>
  `sessionry_${paneId.replace(/[^a-zA-Z0-9\-]/g, '_').slice(0, 190)}`

export class TerminalService {
  private readonly cwd = process.cwd()
  private readonly shellCandidates = resolveShellCandidates()
  private readonly sessions = new Map<string, ManagedTerminalSession>()
  private readonly pendingSizes = new Map<string, { cols: number; rows: number }>()
  private readonly tmuxBin: string | null

  constructor(
    private readonly sendData: (event: TerminalDataEvent) => void,
    private readonly sendState: (event: TerminalStateEvent) => void,
    private readonly sendExit: (event: TerminalExitEvent) => void,
    private readonly tmuxSettings: TmuxSettings
  ) {
    this.tmuxBin = tmuxSettings.enabled ? detectTmux() : null
    if (this.tmuxBin) {
      console.log(`[sessionry] tmux found at "${this.tmuxBin}" — sessions will persist across restarts.`)
    } else if (tmuxSettings.enabled) {
      console.warn('[sessionry] tmux not found — sessions will not persist across restarts.')
    }
  }

  createSession(input: CreateTerminalSessionInput): TerminalSessionInfo {
    ensureNodePtyHelpersExecutable()

    const cwd = input.cwd ?? this.cwd
    const existing = this.sessions.get(input.sessionId)
    const size =
      this.normalizeSize(input.cols, input.rows) ??
      existing?.size ??
      this.pendingSizes.get(input.sessionId) ?? { cols: 80, rows: 24 }
    if (existing && !input.restart) {
      if (cwd !== existing.state.cwd) {
        existing.state = { ...existing.state, cwd }
      }
      existing.size = size
      this.emitState(existing.state)
      return existing.state
    }

    if (existing) {
      this.disposeSession(input.sessionId)
    }

    const startingState: TerminalSessionInfo = {
      id: input.sessionId,
      shell: this.shellCandidates[0] ?? 'unavailable',
      cwd,
      pid: -1,
      state: 'starting',
      buffer: ''
    }
    this.sessions.set(input.sessionId, { state: startingState, isTmuxBacked: false })
    this.emitState(startingState)

    // Try tmux-backed session first
    if (this.tmuxBin) {
      const tmuxName = toTmuxName(input.sessionId)
      this.ensureTmuxSession(tmuxName, cwd)

      try {
        const pty = spawn(this.tmuxBin, [...this.tmuxBaseArgs(), 'attach-session', '-t', tmuxName], {
          name: 'screen-256color',
          cols: size.cols,
          rows: size.rows,
          cwd,
          env: {
            ...process.env,
            HOME: process.env.HOME ?? os.homedir(),
            LANG: process.env.LANG ?? 'en_US.UTF-8',
            PATH: process.env.PATH ?? DEFAULT_PATH,
            TERM: 'xterm-256color'
          }
        })

        const session: ManagedTerminalSession = {
          pty,
          size,
          isTmuxBacked: true,
          state: {
            id: input.sessionId,
            shell: this.tmuxBin,
            cwd,
            pid: pty.pid,
            state: 'ready',
            buffer: '' // Always empty — tmux repaints the current screen on attach
          }
        }
        this.sessions.set(input.sessionId, session)
        this.pendingSizes.delete(input.sessionId)
        this.emitState(session.state)

        pty.onData((data) => {
          session.state = {
            ...session.state,
            buffer: `${session.state.buffer ?? ''}${data}`
          }
          this.sendData({
            sessionId: input.sessionId,
            data
          })
        })

        pty.onExit(({ exitCode }) => {
          const current = this.sessions.get(input.sessionId)
          if (!current) return

          current.pty = undefined

          // exitCode 0 means clean detach (e.g. app is quitting) — tmux session is still alive.
          // For non-zero exits, verify whether the tmux session still exists before marking as exited.
          const sessionAlive = exitCode === 0 || this.tmuxSessionExists(toTmuxName(input.sessionId))
          if (sessionAlive) {
            current.state = { ...current.state, pid: -1 }
            return
          }

          current.state = { ...current.state, pid: -1, state: 'exited' }
          this.emitState(current.state)
          this.sendExit({ sessionId: input.sessionId, exitCode })
        })

        return session.state
      } catch (error) {
        console.warn('[sessionry] Failed to start tmux session, falling back to direct shell.', error)
      }
    }

    // Fallback: raw shell session
    let lastError: unknown

    for (const shell of this.shellCandidates) {
      try {
        const pty = spawn(shell, shellArgs(shell), {
          name: 'xterm-256color',
          cols: size.cols,
          rows: size.rows,
          cwd,
          env: {
            ...process.env,
            HOME: process.env.HOME ?? os.homedir(),
            LANG: process.env.LANG ?? 'en_US.UTF-8',
            PATH: process.env.PATH ?? DEFAULT_PATH,
            TERM: 'xterm-256color'
          }
        })

        const session: ManagedTerminalSession = {
          pty,
          size,
          isTmuxBacked: false,
          state: {
            id: input.sessionId,
            shell,
            cwd,
            pid: pty.pid,
            state: 'ready',
            buffer: ''
          }
        }
        this.sessions.set(input.sessionId, session)
        this.pendingSizes.delete(input.sessionId)
        this.emitState(session.state)

        pty.onData((data) => {
          session.state = {
            ...session.state,
            buffer: `${session.state.buffer ?? ''}${data}`
          }
          this.sendData({
            sessionId: input.sessionId,
            data
          })
        })

        pty.onExit(({ exitCode }) => {
          const current = this.sessions.get(input.sessionId)
          if (!current) return

          current.pty = undefined
          current.state = {
            ...current.state,
            pid: -1,
            state: 'exited'
          }
          this.emitState(current.state)
          this.sendExit({
            sessionId: input.sessionId,
            exitCode
          })
        })

        return session.state
      } catch (error) {
        lastError = error
      }
    }

    const failedState: TerminalSessionInfo = {
      id: input.sessionId,
      shell: this.shellCandidates[0] ?? 'unavailable',
      cwd,
      pid: -1,
      state: 'exited',
      buffer: ''
    }
    this.sessions.set(input.sessionId, { state: failedState, isTmuxBacked: false })
    this.emitState(failedState)

    const reason = lastError instanceof Error ? lastError.message : 'Unknown PTY spawn failure'
    this.sendData({
      sessionId: input.sessionId,
      data: `\r\n[sessionry] Failed to start shell.\r\nTried: ${this.shellCandidates.join(', ') || 'none'}\r\nReason: ${reason}\r\n`
    })

    throw new Error(`Unable to start a terminal shell. Tried: ${this.shellCandidates.join(', ') || 'none'}. ${reason}`)
  }

  handleInput(payload: TerminalInputPayload): void {
    this.sessions.get(payload.sessionId)?.pty?.write(payload.data)
  }

  handleResize(payload: TerminalResizePayload): void {
    if (payload.cols < 2 || payload.rows < 1) return
    const size = { cols: payload.cols, rows: payload.rows }
    this.pendingSizes.set(payload.sessionId, size)
    const session = this.sessions.get(payload.sessionId)
    if (session) {
      const sizeUnchanged = session.size?.cols === size.cols && session.size?.rows === size.rows
      session.size = size
      if (sizeUnchanged) return
    }
    const pty = session?.pty
    if (!pty) return
    pty.resize(payload.cols, payload.rows)
  }

  killSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    session?.pty?.kill()
    if (session?.isTmuxBacked) {
      this.killTmuxSession(toTmuxName(sessionId))
    }
    this.sessions.delete(sessionId)
  }

  dispose(): void {
    for (const sessionId of this.sessions.keys()) {
      this.disposeSession(sessionId)
    }
    this.sessions.clear()

    if (this.tmuxBin && this.tmuxSettings.killOnExit) {
      if (this.tmuxSettings.dedicatedSocket) {
        // Kill the entire dedicated server in one shot.
        spawnSync(this.tmuxBin, ['-L', TMUX_SOCKET, 'kill-server'], { timeout: 5000 })
      } else {
        // No dedicated socket — we only own sessions prefixed with 'sessionry_',
        // so kill them individually rather than nuking the user's whole server.
        const result = spawnSync(
          this.tmuxBin,
          [...this.tmuxBaseArgs(), 'list-sessions', '-F', '#{session_name}'],
          { encoding: 'utf8', timeout: 5000 }
        )
        if (result.status === 0) {
          for (const name of result.stdout.trim().split('\n')) {
            if (name.startsWith('sessionry_')) {
              this.tmux(['kill-session', '-t', name])
            }
          }
        }
      }
    }
  }

  private disposeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session?.pty) {
      // For tmux-backed sessions, killing the attach PTY sends SIGHUP which
      // detaches the client but leaves the tmux server session running.
      // For raw sessions this terminates the shell.
      session.pty.kill()
      session.pty = undefined
    }
  }

  private tmuxBaseArgs(): string[] {
    const args: string[] = []
    if (this.tmuxSettings.dedicatedSocket) args.push('-L', TMUX_SOCKET)
    if (!this.tmuxSettings.inheritConfig) args.push('-f', '/dev/null')
    return args
  }

  private tmux(args: string[]): ReturnType<typeof spawnSync> {
    return spawnSync(this.tmuxBin!, [...this.tmuxBaseArgs(), ...args], { timeout: 5000 })
  }

  private tmuxSessionExists(name: string): boolean {
    if (!this.tmuxBin) return false
    return this.tmux(['has-session', '-t', name]).status === 0
  }

  private ensureTmuxSession(name: string, cwd: string): void {
    if (!this.tmuxSessionExists(name)) {
      this.tmux(['new-session', '-d', '-s', name, '-c', cwd])
      if (this.tmuxSettings.disableStatusBar) {
        this.tmux(['set-option', '-t', name, 'status', 'off'])
      }
    }
  }

  private killTmuxSession(name: string): void {
    if (!this.tmuxBin) return
    this.tmux(['kill-session', '-t', name])
  }

  private emitState(state: TerminalSessionInfo): void {
    this.sendState({
      sessionId: state.id,
      shell: state.shell,
      cwd: state.cwd,
      pid: state.pid,
      state: state.state
    })
  }

  private normalizeSize(cols?: number, rows?: number): { cols: number; rows: number } | null {
    if (typeof cols !== 'number' || typeof rows !== 'number') return null
    if (cols < 2 || rows < 1) return null
    return { cols, rows }
  }
}
