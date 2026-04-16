export type TerminalSessionState = 'idle' | 'starting' | 'ready' | 'exited'

export interface TerminalSessionInfo {
  id: string
  shell: string
  cwd: string
  pid: number
  state: TerminalSessionState
}

export interface TerminalDataEvent {
  sessionId: string
  data: string
}

export interface TerminalExitEvent {
  sessionId: string
  exitCode: number
}

export interface TerminalStateEvent {
  sessionId: string
  shell: string
  cwd: string
  pid: number
  state: TerminalSessionState
}

export interface TerminalResizePayload {
  sessionId: string
  cols: number
  rows: number
}

export interface TerminalInputPayload {
  sessionId: string
  data: string
}
