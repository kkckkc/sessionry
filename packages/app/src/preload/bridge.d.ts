import type {
  ActionDescriptor,
  ActionExecutionRequest,
  ActionExecutionResult,
  AppSettings,
  ThemeDefinition,
  WorkspaceEvent,
  WorkspaceCommand,
  WorkspaceCommandResult,
  WorkspaceStateSnapshot,
  PluginViewModel,
  UserPluginRendererInfo,
  CreateTerminalSessionInput,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalInputPayload,
  TerminalResizePayload,
  TerminalSessionInfo,
  TerminalStateEvent,
  ResolvedVcsStatus,
  VcsFileStatus
} from '@sessionry/plugin-api';

type Unsubscribe = () => void;

export interface TerminalAppBridge {
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
    onEvent: (listener: (event: WorkspaceEvent) => void) => Unsubscribe;
  };
  showFolderDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  readDirectory: (dirPath: string) => Promise<{ name: string; isDirectory: boolean }[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  vcs: {
    getStatus: (dirPath: string, options?: { bypassCache?: boolean }) => Promise<ResolvedVcsStatus | null>;
    getDiff: (dirPath: string, file: VcsFileStatus) => Promise<string | null>;
    stageFiles: (dirPath: string, files: VcsFileStatus[]) => Promise<void>;
    commit: (dirPath: string, message: string) => Promise<void>;
    push: (dirPath: string) => Promise<void>;
    createPullRequest: (dirPath: string) => Promise<void>;
    createBranch: (dirPath: string, branchName: string) => Promise<void>;
    listBranches: (dirPath: string) => Promise<string[]>;
    switchBranch: (dirPath: string, branchName: string) => Promise<void>;
  };
  getPathForDroppedFile: (file: File) => string;
  formatPathForTerminal: (targetPath: string, sessionRoot?: string) => string;
  settings: {
    read: () => Promise<AppSettings>;
    readSync: () => AppSettings;
    update: (updates: Partial<AppSettings>) => Promise<void>;
    onChange: (listener: (settings: AppSettings) => void) => Unsubscribe;
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
    ) => Unsubscribe;
    onUpdateProgress: (
      listener: (data: { downloaded: number; total: number }) => void
    ) => Unsubscribe;
  };
  onTerminalData: (listener: (event: TerminalDataEvent) => void) => Unsubscribe;
  onTerminalState: (listener: (event: TerminalStateEvent) => void) => Unsubscribe;
  onTerminalExit: (listener: (event: TerminalExitEvent) => void) => Unsubscribe;
  clipboard: {
    readText: () => Promise<string>;
    writeText: (text: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    terminalApp: TerminalAppBridge;
  }
}
