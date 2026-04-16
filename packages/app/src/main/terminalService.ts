import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'

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

const DEFAULT_PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
const EXECUTABLE_MODE = 0o755
const require = createRequire(import.meta.url)

interface ManagedTerminalSession {
  pty?: IPty
  state: TerminalSessionInfo
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

export class TerminalService {
  private readonly cwd = process.cwd()
  private readonly shellCandidates = resolveShellCandidates()
  private readonly sessions = new Map<string, ManagedTerminalSession>()

  constructor(
    private readonly sendData: (event: TerminalDataEvent) => void,
    private readonly sendState: (event: TerminalStateEvent) => void,
    private readonly sendExit: (event: TerminalExitEvent) => void
  ) {}

  createSession(input: CreateTerminalSessionInput): TerminalSessionInfo {
    ensureNodePtyHelpersExecutable()

    const cwd = input.cwd ?? this.cwd
    const existing = this.sessions.get(input.sessionId)
    if (existing && !input.restart) {
      if (cwd !== existing.state.cwd) {
        existing.state = { ...existing.state, cwd }
      }
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
    this.sessions.set(input.sessionId, { state: startingState })
    this.emitState(startingState)

    let lastError: unknown

    for (const shell of this.shellCandidates) {
      try {
        const pty = spawn(shell, shellArgs(shell), {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
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
    this.sessions.set(input.sessionId, { state: failedState })
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
    const pty = this.sessions.get(payload.sessionId)?.pty
    if (!pty) return
    if (payload.cols < 2 || payload.rows < 1) return
    pty.resize(payload.cols, payload.rows)
  }

  dispose(): void {
    for (const sessionId of this.sessions.keys()) {
      this.disposeSession(sessionId)
    }
    this.sessions.clear()
  }

  private disposeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    session?.pty?.kill()
    if (session) {
      session.pty = undefined
    }
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
}
