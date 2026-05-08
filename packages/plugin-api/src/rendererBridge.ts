import type { ActionDescriptor, ActionExecutionRequest, ActionExecutionResult } from './actions';
import type { PluginViewModel } from './plugins';
import type { AppSettings } from './settings';
import type { ThemeDefinition } from './themes';
import type { ResolvedVcsStatus, VcsFileStatus } from './vcs';
import type {
  WorkspaceCommand,
  WorkspaceCommandResult,
  WorkspaceEvent,
  WorkspaceStateSnapshot
} from './workspace';
import type {
  CreateTerminalSessionInput,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalSessionInfo,
  TerminalStateEvent
} from './terminal';

export interface UserPluginRendererInfo {
  pluginId: string;
  rendererUrl: string;
}

export interface TerminalAppBridge {
  openExternal: (url: string) => Promise<void>;
  showFolderDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  readDirectory: (dirPath: string) => Promise<{ name: string; isDirectory: boolean }[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  vcs: {
    getStatus: (dirPath: string, options?: { bypassCache?: boolean }) => Promise<ResolvedVcsStatus | null>;
    getDiff: (dirPath: string, file: VcsFileStatus) => Promise<string | null>;
    stageFiles: (dirPath: string, files: VcsFileStatus[]) => Promise<void>;
    commit: (dirPath: string, message: string) => Promise<void>;
    createBranch: (dirPath: string, branchName: string) => Promise<void>;
  };
  getPathForDroppedFile: (file: File) => string;
  formatPathForTerminal: (targetPath: string, sessionRoot?: string) => string;
  createTerminalSession: (input: CreateTerminalSessionInput) => Promise<TerminalSessionInfo>;
  sendTerminalInput: (payload: TerminalInputPayload) => void;
  resizeTerminal: (payload: TerminalResizePayload) => void;
  getPluginModel: () => Promise<PluginViewModel>;
  getUserPluginRenderers: () => Promise<UserPluginRendererInfo[]>;
  actions: {
    list: () => Promise<ActionDescriptor[]>;
    execute: (request: ActionExecutionRequest) => Promise<ActionExecutionResult>;
  };
  workspace: {
    read: () => WorkspaceStateSnapshot;
    executeCommand: (command: WorkspaceCommand) => Promise<WorkspaceCommandResult>;
    onEvent: (listener: (event: WorkspaceEvent) => void) => () => void;
  };
  settings: {
    read: () => Promise<AppSettings>;
    update: (updates: Partial<AppSettings>) => Promise<void>;
    onChange: (listener: (settings: AppSettings) => void) => () => void;
  };
  themes: {
    getTheme: (themeId: string) => Promise<ThemeDefinition | undefined>;
    getAllThemes: () => Promise<ThemeDefinition[]>;
    getThemeIds: () => Promise<string[]>;
  };
  plugins: {
    // biome-ignore lint/suspicious/noExplicitAny: External IPC API boundary - types come from main process
    search: (query: string, options?: { size?: number }) => Promise<any[]>;
    // biome-ignore lint/suspicious/noExplicitAny: External IPC API boundary - types come from main process
    install: (packageName: string, version?: string) => Promise<any>;
    uninstall: (pluginId: string) => Promise<boolean>;
    // biome-ignore lint/suspicious/noExplicitAny: External IPC API boundary - types come from main process
    update: (pluginId: string, packageName: string) => Promise<any>;
    // biome-ignore lint/suspicious/noExplicitAny: External IPC API boundary - types come from main process
    list: () => Promise<any[]>;
    // biome-ignore lint/suspicious/noExplicitAny: External IPC API boundary - types come from main process
    enable: (pluginId: string) => Promise<any>;
    // biome-ignore lint/suspicious/noExplicitAny: External IPC API boundary - types come from main process
    disable: (pluginId: string) => Promise<any>;
    // biome-ignore lint/suspicious/noExplicitAny: External IPC API boundary - types come from main process
    checkUpdates: () => Promise<any[]>;
    onInstallProgress: (
      listener: (data: { downloaded: number; total: number }) => void
    ) => () => void;
    onUpdateProgress: (
      listener: (data: { downloaded: number; total: number }) => void
    ) => () => void;
  };
  onTerminalData: (listener: (event: TerminalDataEvent) => void) => () => void;
  onTerminalState: (listener: (event: TerminalStateEvent) => void) => () => void;
  onTerminalExit: (listener: (event: TerminalExitEvent) => void) => () => void;
}
