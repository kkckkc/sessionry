import type { ActionDescriptor, ActionExecutionRequest, ActionExecutionResult } from './actions'
import type { PluginViewModel } from './plugins'
import type { AppSettings } from './settings'
import type { ThemeDefinition } from './themes'
import type { ResolvedVcsStatus } from './vcs'
import type {
  WorkspaceCommand,
  WorkspaceCommandResult,
  WorkspaceEvent,
  WorkspaceStateSnapshot
} from './workspace'
import type {
  CreateTerminalSessionInput,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalSessionInfo,
  TerminalStateEvent
} from './terminal'

export interface UserPluginRendererInfo {
  pluginId: string
  rendererUrl: string
}

export interface TerminalAppBridge {
  showFolderDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
  readDirectory: (dirPath: string) => Promise<{ name: string; isDirectory: boolean }[]>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  vcs: {
    getStatus: (dirPath: string) => Promise<ResolvedVcsStatus | null>
  }
  getPathForDroppedFile: (file: File) => string
  formatPathForTerminal: (targetPath: string, sessionRoot?: string) => string
  createTerminalSession: (input: CreateTerminalSessionInput) => Promise<TerminalSessionInfo>
  sendTerminalInput: (payload: TerminalInputPayload) => void
  resizeTerminal: (payload: TerminalResizePayload) => void
  getPluginModel: () => Promise<PluginViewModel>
  getUserPluginRenderers: () => Promise<UserPluginRendererInfo[]>
  actions: {
    list: () => Promise<ActionDescriptor[]>
    execute: (request: ActionExecutionRequest) => Promise<ActionExecutionResult>
  }
  workspace: {
    read: () => WorkspaceStateSnapshot
    executeCommand: (command: WorkspaceCommand) => Promise<WorkspaceCommandResult>
    onEvent: (listener: (event: WorkspaceEvent) => void) => () => void
  }
  settings: {
    read: () => Promise<AppSettings>
    update: (updates: Partial<AppSettings>) => Promise<void>
    onChange: (listener: (settings: AppSettings) => void) => () => void
  }
  themes: {
    getTheme: (themeId: string) => Promise<ThemeDefinition | undefined>
    getAllThemes: () => Promise<ThemeDefinition[]>
    getThemeIds: () => Promise<string[]>
  }
  plugins: {
    search: (query: string, options?: { size?: number }) => Promise<any[]>
    install: (packageName: string, version?: string) => Promise<any>
    uninstall: (pluginId: string) => Promise<boolean>
    update: (pluginId: string, packageName: string) => Promise<any>
    list: () => Promise<any[]>
    enable: (pluginId: string) => Promise<any>
    disable: (pluginId: string) => Promise<any>
    checkUpdates: () => Promise<any[]>
    onInstallProgress: (listener: (data: { downloaded: number; total: number }) => void) => () => void
    onUpdateProgress: (listener: (data: { downloaded: number; total: number }) => void) => () => void
  }
  onTerminalData: (listener: (event: TerminalDataEvent) => void) => () => void
  onTerminalState: (listener: (event: TerminalStateEvent) => void) => () => void
  onTerminalExit: (listener: (event: TerminalExitEvent) => void) => () => void
}
