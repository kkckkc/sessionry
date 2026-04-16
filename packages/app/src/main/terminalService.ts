import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'

import { spawn, type IPty } from 'node-pty'

import type {
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

  const candidates = [
    process.env.SHELL,
    os.userInfo().shell,
    '/bin/zsh',
    '/bin/bash',
    '/bin/sh'
  ]

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
  private pty?: IPty
  private readonly cwd = process.cwd()
  private readonly shellCandidates = resolveShellCandidates()
  private readonly sessionId = 'primary'
  private state: TerminalSessionInfo = {
    id: this.sessionId,
    shell: this.shellCandidates[0] ?? 'unavailable',
    cwd: this.cwd,
    pid: -1,
    state: 'idle'
  }

  constructor(
    private readonly sendData: (event: TerminalDataEvent) => void,
    private readonly sendState: (event: TerminalStateEvent) => void,
    private readonly sendExit: (event: TerminalExitEvent) => void
  ) {}

  createSession(): TerminalSessionInfo {
    ensureNodePtyHelpersExecutable()

    this.disposePty()
    this.state = { ...this.state, state: 'starting', pid: -1 }
    this.emitState()

    let lastError: unknown

    for (const shell of this.shellCandidates) {
      try {
        this.pty = spawn(shell, shellArgs(shell), {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd: this.cwd,
          env: {
            ...process.env,
            HOME: process.env.HOME ?? os.homedir(),
            LANG: process.env.LANG ?? 'en_US.UTF-8',
            PATH: process.env.PATH ?? DEFAULT_PATH,
            TERM: 'xterm-256color'
          }
        })

        this.state = {
          id: this.sessionId,
          shell,
          cwd: this.cwd,
          pid: this.pty.pid,
          state: 'ready'
        }
        this.emitState()

        this.pty.onData((data) => {
          this.sendData({
            sessionId: this.sessionId,
            data
          })
        })

        this.pty.onExit(({ exitCode }) => {
          this.state = {
            ...this.state,
            state: 'exited',
            pid: -1
          }
          this.emitState()
          this.sendExit({
            sessionId: this.sessionId,
            exitCode
          })
        })

        return this.state
      } catch (error) {
        lastError = error
      }
    }

    this.state = {
      ...this.state,
      shell: this.shellCandidates[0] ?? 'unavailable',
      state: 'exited',
      pid: -1
    }
    this.emitState()

    const reason = lastError instanceof Error ? lastError.message : 'Unknown PTY spawn failure'
    this.sendData({
      sessionId: this.sessionId,
      data: `\r\n[sessionry] Failed to start shell.\r\nTried: ${this.shellCandidates.join(', ') || 'none'}\r\nReason: ${reason}\r\n`
    })

    throw new Error(`Unable to start a terminal shell. Tried: ${this.shellCandidates.join(', ') || 'none'}. ${reason}`)
  }

  getState(): TerminalSessionInfo {
    return this.state
  }

  handleInput(payload: TerminalInputPayload): void {
    if (payload.sessionId !== this.sessionId || !this.pty) return
    this.pty.write(payload.data)
  }

  handleResize(payload: TerminalResizePayload): void {
    if (payload.sessionId !== this.sessionId || !this.pty) return
    if (payload.cols < 2 || payload.rows < 1) return
    this.pty.resize(payload.cols, payload.rows)
  }

  dispose(): void {
    this.disposePty()
  }

  private disposePty(): void {
    this.pty?.kill()
    this.pty = undefined
  }

  private emitState(): void {
    this.sendState({
      sessionId: this.sessionId,
      shell: this.state.shell,
      cwd: this.state.cwd,
      pid: this.state.pid,
      state: this.state.state
    })
  }
}
