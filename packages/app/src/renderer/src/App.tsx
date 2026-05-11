import type {
  ActionInvocationSource,
  AppSettings,
  AppTheme,
  PluginViewModel,
  TerminalSessionInfo,
  TerminalStateEvent,
  WorkspaceStateSnapshot
} from '@sessionry/plugin-api';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getActiveVisibleTerminalPaneId } from '@sessionry/plugin-default-view-workspace/renderer';

import { AppShell } from './components/AppShell';
import { CommandPalette } from './components/CommandPalette';
import { createActionKeydownHandler, type KeybindingOverrides } from './lib/keybindings';
import { SettingsView } from './components/SettingsView';
import { WorkspaceSlotView } from './components/WorkspaceSlotView';
import { readWorkspaceSnapshot, workspace } from './lib/workspace';
import { getRendererView, loadUserPluginRenderers } from './plugins';
import { applyTheme, applyColorTheme, watchSystemTheme } from './lib/theme';
import { PluginManagerProvider } from '../components/PluginManager';

const emptyPlugins: PluginViewModel = {
  actions: [],
  toolbarActionIds: [],
  statusItems: [],
  viewsBySlot: {}
};

export const App = () => {
  const [plugins, setPlugins] = useState<PluginViewModel>(emptyPlugins);
  const [keybindingOverrides, setKeybindingOverrides] = useState<KeybindingOverrides>({
    custom: {},
    disabled: []
  });
  const [terminalSessions, setTerminalSessions] = useState<Record<string, TerminalSessionInfo>>({});
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<WorkspaceStateSnapshot>(() =>
    readWorkspaceSnapshot()
  );
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);
  const [statusBarVisible, setStatusBarVisible] = useState(true);
  const [clearSignal, setClearSignal] = useState(0);
  const themeRef = useRef<AppTheme>('system');
  const initializedRef = useRef(false);

  const activeWorkspaceSessionId =
    workspaceSnapshot.activeSessionId ?? workspaceSnapshot.sessions[0]?.id;
  const activeProjectId =
    workspaceSnapshot.sessions.find(session => session.id === activeWorkspaceSessionId)
      ?.projectId ?? workspaceSnapshot.projects[0]?.id;
  const activeProject =
    activeProjectId !== undefined
      ? workspaceSnapshot.projects.find(project => project.id === activeProjectId)
      : undefined;
  const activeTerminalPaneId = getActiveVisibleTerminalPaneId(
    workspaceSnapshot,
    activeWorkspaceSessionId
  );
  const activeTerminalSession = activeTerminalPaneId
    ? (terminalSessions[activeTerminalPaneId] ?? null)
    : null;

  const brandText = activeProject?.name 
    ? `Sessionry: ${activeProject.name}` 
    : 'Sessionry';

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    void Promise.all([
      window.terminalApp.getPluginModel(),
      loadUserPluginRenderers(),
      window.terminalApp.settings.read()
    ]).then(([pluginModel, , settings]) => {
      setPlugins(pluginModel);
      setStatusBarVisible(settings.statusBarVisible);
      themeRef.current = settings.theme ?? 'system';
      applyTheme(themeRef.current);
      applyColorTheme(
        settings.colorTheme ?? 'default',
        settings.terminalBgOverride ?? false,
        settings.terminalBgColor ?? '#000000'
      );
    });
    setWorkspaceSnapshot(readWorkspaceSnapshot());

    const unsubscribeSettings = window.terminalApp.settings.onChange((settings: AppSettings) => {
      setStatusBarVisible(settings.statusBarVisible);
      themeRef.current = settings.theme ?? 'system';
      applyTheme(themeRef.current);
      applyColorTheme(
        settings.colorTheme ?? 'default',
        settings.terminalBgOverride ?? false,
        settings.terminalBgColor ?? '#000000'
      );
    });

    const unsubscribeSystemTheme = watchSystemTheme(() => themeRef.current);

    const unsubscribeState = window.terminalApp.onTerminalState((event: TerminalStateEvent) => {
      setTerminalSessions(value => ({
        ...value,
        [event.sessionId]: {
          ...(value[event.sessionId] ?? {}),
          id: event.sessionId,
          shell: event.shell,
          cwd: event.cwd,
          pid: event.pid,
          state: event.state
        }
      }));
    });
    let workspaceRefreshFrame: number | null = null;
    const refreshWorkspaceSnapshot = () => {
      workspaceRefreshFrame = null;
      setWorkspaceSnapshot(readWorkspaceSnapshot());
    };
    const unsubscribeWorkspace = workspace.subscribeAll(() => {
      if (workspaceRefreshFrame !== null) return;
      workspaceRefreshFrame = window.requestAnimationFrame(refreshWorkspaceSnapshot);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeSystemTheme();
      unsubscribeState();
      unsubscribeWorkspace();
      if (workspaceRefreshFrame !== null) window.cancelAnimationFrame(workspaceRefreshFrame);
    };
  }, []);

  const executeAction = useCallback(
    (actionId: string, source: ActionInvocationSource, args?: Record<string, unknown>) => {
      void window.terminalApp.actions.execute({ actionId, source, args }).then(result => {
        if (result.status !== 'completed') return;

        for (const effect of result.effects ?? []) {
          switch (effect.type) {
            case 'layout.toggle-left':
              setLeftVisible(value => !value);
              break;
            case 'layout.toggle-right':
              setRightVisible(value => !value);
              break;
            case 'terminal.clear-active':
              setClearSignal(value => value + 1);
              break;
            case 'terminal.restart-active': {
              const paneId =
                typeof effect.payload?.paneId === 'string'
                  ? effect.payload.paneId
                  : (activeTerminalPaneId ?? undefined);
              if (!paneId) break;

              void window.terminalApp
                .createTerminalSession({
                  sessionId: paneId,
                  cwd: workspaceSnapshot.sessions.find(
                    value => value.id === activeWorkspaceSessionId
                  )?.folder,
                  restart: true
                })
                .then(terminalSession => {
                  setTerminalSessions(value => ({
                    ...value,
                    [terminalSession.id]: terminalSession
                  }));
                });
              break;
            }
            case 'pane.close-focused': {
              const paneId =
                typeof effect.payload?.paneId === 'string' ? effect.payload.paneId : undefined;
              if (!paneId) break;

              window.dispatchEvent(
                new CustomEvent('sessionry:close-pane', {
                  detail: { paneId }
                })
              );
              break;
            }
            case 'pane.new-tab': {
              const focusedPaneId =
                typeof effect.payload?.focusedPaneId === 'string'
                  ? effect.payload.focusedPaneId
                  : activeTerminalPaneId;

              window.dispatchEvent(
                new CustomEvent('sessionry:new-tab', {
                  detail: { focusedPaneId }
                })
              );
              break;
            }
            case 'pane.new-chat': {
              const focusedPaneId =
                typeof effect.payload?.focusedPaneId === 'string'
                  ? effect.payload.focusedPaneId
                  : activeTerminalPaneId;

              window.dispatchEvent(
                new CustomEvent('sessionry:new-chat', {
                  detail: { focusedPaneId }
                })
              );
              break;
            }
            default:
              break;
          }
        }
      });
    },
    [activeTerminalPaneId, activeWorkspaceSessionId, workspaceSnapshot]
  );

  // Load initial keybindings from settings
  useEffect(() => {
    void window.terminalApp.settings.read().then(settings => {
      setKeybindingOverrides(settings.keybindings);
    });
  }, []);

  // Listen for keybinding reload events
  useEffect(() => {
    const unsubscribe = window.terminalApp.keybindings.onReload(
      (overrides: { custom: Record<string, string>; disabled: string[] }) => {
        setKeybindingOverrides(overrides);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleKeydown = createActionKeydownHandler(
      plugins.actions,
      keybindingOverrides,
      actionId => executeAction(actionId, 'shortcut')
    );

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [plugins.actions, keybindingOverrides, executeAction]);

  const showSettings = activeProject?.activeViews.workspace === 'view.settings';
  const closeSettings = () => executeAction('workspace:show-default-view', 'api');

  return (
    <PluginManagerProvider>
      <AppShell
        plugins={plugins}
        workspace={workspace}
        session={activeTerminalSession}
        leftVisible={leftVisible}
        rightVisible={rightVisible}
        statusBarVisible={statusBarVisible}
        brandText={brandText}
        mainContent={
          <WorkspaceSlotView
            plugins={plugins}
            workspace={workspace}
            selectedViewId={showSettings ? undefined : activeProject?.activeViews.workspace}
            resolveRendererView={getRendererView}
            clearSignal={clearSignal}
          />
        }
        onToolbarAction={actionId => executeAction(actionId, 'toolbar')}
        resolveRendererView={getRendererView}
      />
      <SettingsView
        open={showSettings}
        onClose={closeSettings}
        resolveRendererView={getRendererView}
      />
      <CommandPalette
        actions={plugins.actions}
        onExecute={(actionId, args) => executeAction(actionId, 'palette', args)}
      />
    </PluginManagerProvider>
  );
};
