/**
 * Centralized mock factory for window.terminalApp
 * 
 * This provides a complete mock of the TerminalAppBridge interface.
 * When the IPC contract changes, only this file needs to be updated.
 * 
 * Usage in tests:
 * ```ts
 * import { createMockTerminalApp } from '../test-utils/mockTerminalApp';
 * 
 * beforeEach(() => {
 *   global.window.terminalApp = createMockTerminalApp();
 * });
 * 
 * // Override specific methods in individual tests:
 * it('handles VCS status', async () => {
 *   const mockGetStatus = vi.fn().mockResolvedValue({ ... });
 *   global.window.terminalApp = createMockTerminalApp({
 *     vcs: { getStatus: mockGetStatus }
 *   });
 * });
 * ```
 */

import { vi } from 'vitest';
import type { TerminalAppBridge } from '../../preload/bridge';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Creates a complete mock of the TerminalAppBridge with all methods stubbed.
 * Accepts partial overrides for customization in specific tests.
 */
export function createMockTerminalApp(
  overrides?: DeepPartial<TerminalAppBridge>
): TerminalAppBridge {
  const defaultMock: TerminalAppBridge = {
    createTerminalSession: vi.fn().mockResolvedValue({
      id: 'mock-session',
      folder: '/mock/folder',
      shell: '/bin/bash'
    }),
    sendTerminalInput: vi.fn(),
    resizeTerminal: vi.fn(),
    getPluginModel: vi.fn().mockResolvedValue({
      actions: [],
      views: [],
      themes: []
    }),
    getUserPluginRenderers: vi.fn().mockResolvedValue([]),
    actions: {
      list: vi.fn().mockResolvedValue([]),
      execute: vi.fn().mockResolvedValue({ success: true })
    },
    workspace: {
      read: vi.fn().mockReturnValue({
        projects: [],
        sessions: [],
        paneGroups: [],
        panes: [],
        activeSessionId: null
      }),
      executeCommand: vi.fn().mockResolvedValue({ success: true }),
      onEvent: vi.fn().mockReturnValue(() => {})
    },
    showFolderDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    readDirectory: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    openExternal: vi.fn().mockResolvedValue(undefined),
    vcs: {
      getStatus: vi.fn().mockResolvedValue(null),
      getDiff: vi.fn().mockResolvedValue(null),
      stageFiles: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      push: vi.fn().mockResolvedValue(undefined),
      pull: vi.fn().mockResolvedValue(undefined),
      createPullRequest: vi.fn().mockResolvedValue(undefined),
      createBranch: vi.fn().mockResolvedValue(undefined),
      listBranches: vi.fn().mockResolvedValue([]),
      switchBranch: vi.fn().mockResolvedValue(undefined)
    },
    getPathForDroppedFile: vi.fn().mockReturnValue('/mock/path'),
    formatPathForTerminal: vi.fn().mockImplementation((path) => path),
    settings: {
      read: vi.fn().mockResolvedValue({}),
      readSync: vi.fn().mockReturnValue({}),
      update: vi.fn().mockResolvedValue(undefined),
      onChange: vi.fn().mockReturnValue(() => {})
    },
    themes: {
      getTheme: vi.fn().mockResolvedValue(undefined),
      getAllThemes: vi.fn().mockResolvedValue([]),
      getThemeIds: vi.fn().mockResolvedValue([])
    },
    plugins: {
      search: vi.fn().mockResolvedValue([]),
      install: vi.fn().mockResolvedValue({}),
      uninstall: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockResolvedValue({}),
      list: vi.fn().mockResolvedValue([]),
      enable: vi.fn().mockResolvedValue({}),
      disable: vi.fn().mockResolvedValue({}),
      checkUpdates: vi.fn().mockResolvedValue([]),
      onInstallProgress: vi.fn().mockReturnValue(() => {}),
      onUpdateProgress: vi.fn().mockReturnValue(() => {})
    },
    onTerminalData: vi.fn().mockReturnValue(() => {}),
    onTerminalState: vi.fn().mockReturnValue(() => {}),
    onTerminalExit: vi.fn().mockReturnValue(() => {}),
    clipboard: {
      readText: vi.fn().mockResolvedValue(''),
      writeText: vi.fn().mockResolvedValue(undefined)
    }
  };

  // Deep merge overrides
  if (overrides) {
    return deepMerge(defaultMock, overrides) as TerminalAppBridge;
  }

  return defaultMock;
}

/**
 * Simple deep merge utility for combining default mock with overrides
 */
function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (sourceValue && typeof sourceValue === 'object' && !vi.isMockFunction(sourceValue)) {
      result[key] = deepMerge(targetValue as object, sourceValue as object) as T[Extract<keyof T, string>];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }
  
  return result;
}
