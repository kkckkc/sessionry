import { useEffect, useRef, useState } from 'react'

import type { PluginViewModel, ToolbarActionId } from '@sessionry/plugin-api'
import type { TerminalSessionInfo, TerminalStateEvent } from '@sessionry/plugin-api'
import type { WorkspaceStateSnapshot } from '@sessionry/plugin-api'
import { getActiveVisibleTerminalPaneId } from '@sessionry/default-workspace-pane-plugin/renderer'

import { AppShell } from './components/AppShell'
import { WorkspaceSlotView } from './components/WorkspaceSlotView'
import { readWorkspaceSnapshot, workspace } from './lib/workspace'
import { getRendererView, loadUserPluginRenderers } from './plugins'

const emptyPlugins: PluginViewModel = {
  toolbar: [],
  leftPanels: [],
  rightPanels: [],
  statusItems: [],
  viewsBySlot: {}
}

export const App = () => {
  const [plugins, setPlugins] = useState<PluginViewModel>(emptyPlugins)
  const [terminalSessions, setTerminalSessions] = useState<Record<string, TerminalSessionInfo>>({})
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<WorkspaceStateSnapshot>(() => readWorkspaceSnapshot())
  const [leftVisible, setLeftVisible] = useState(true)
  const [rightVisible, setRightVisible] = useState(true)
  const [clearSignal, setClearSignal] = useState(0)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    void Promise.all([window.terminalApp.getPluginModel(), loadUserPluginRenderers()]).then(
      ([pluginModel]) => setPlugins(pluginModel)
    )
    setWorkspaceSnapshot(readWorkspaceSnapshot())

    const unsubscribeState = window.terminalApp.onTerminalState((event: TerminalStateEvent) => {
      setTerminalSessions((value) => ({
        ...value,
        [event.sessionId]: {
          ...(value[event.sessionId] ?? {}),
          id: event.sessionId,
          shell: event.shell,
          cwd: event.cwd,
          pid: event.pid,
          state: event.state
        }
      }))
    })
    const unsubscribeWorkspace = workspace.subscribeAll(() => {
      setWorkspaceSnapshot(readWorkspaceSnapshot())
    })

    return () => {
      unsubscribeState()
      unsubscribeWorkspace()
    }
  }, [])

  const activeWorkspaceSessionId = workspaceSnapshot.activeSessionId ?? workspaceSnapshot.sessions[0]?.id
  const activeProjectId =
    workspaceSnapshot.sessions.find((session) => session.id === activeWorkspaceSessionId)?.projectId ??
    workspaceSnapshot.projects[0]?.id
  const activeProject =
    activeProjectId !== undefined
      ? workspaceSnapshot.projects.find((project) => project.id === activeProjectId)
      : undefined
  const activeTerminalPaneId = getActiveVisibleTerminalPaneId(workspaceSnapshot, activeWorkspaceSessionId)
  const activeTerminalSession = activeTerminalPaneId ? terminalSessions[activeTerminalPaneId] ?? null : null

  useEffect(() => {
    if (!activeTerminalPaneId) return

    const activeWorkspaceSession = workspaceSnapshot.sessions.find((value) => value.id === activeWorkspaceSessionId)
    void window.terminalApp
      .createTerminalSession({
        sessionId: activeTerminalPaneId,
        cwd: activeWorkspaceSession?.folder
      })
      .then((terminalSession) => {
        setTerminalSessions((value) => ({
          ...value,
          [terminalSession.id]: terminalSession
        }))
      })
  }, [activeTerminalPaneId, activeWorkspaceSessionId, workspaceSnapshot.sessions])

  const handleToolbarAction = (action: ToolbarActionId) => {
    switch (action) {
      case 'terminal:new':
        if (!activeTerminalPaneId) break
        void window.terminalApp
          .createTerminalSession({
            sessionId: activeTerminalPaneId,
            cwd: workspaceSnapshot.sessions.find((value) => value.id === activeWorkspaceSessionId)?.folder,
            restart: true
          })
          .then((terminalSession) => {
            setTerminalSessions((value) => ({
              ...value,
              [terminalSession.id]: terminalSession
            }))
          })
        break
      case 'terminal:clear':
        setClearSignal((value) => value + 1)
        break
      case 'layout:toggle-left':
        setLeftVisible((value) => !value)
        break
      case 'layout:toggle-right':
        setRightVisible((value) => !value)
        break
      default:
        break
    }
  }

  const handleSelectStackedChild = (paneGroupId: string, childId: string) => {
    void workspace.getPaneGroup(paneGroupId)?.update({ activeChildId: childId })
  }

  const handleActivateSession = (sessionId: string) => {
    void window.terminalApp.workspace.executeCommand({ type: 'session.activate', sessionId })
  }

  return (
    <AppShell
      plugins={plugins}
      session={activeTerminalSession}
      snapshot={workspaceSnapshot}
      activeSessionId={activeWorkspaceSessionId}
      leftVisible={leftVisible}
      rightVisible={rightVisible}
      mainContent={
        <WorkspaceSlotView
          plugins={plugins}
          selectedViewId={activeProject?.activeViews.workspace}
          resolveRendererView={getRendererView}
          snapshot={workspaceSnapshot}
          projectId={activeProjectId}
          sessionId={activeWorkspaceSessionId}
          terminalSession={activeTerminalSession}
          clearSignal={clearSignal}
          activeTerminalPaneId={activeTerminalPaneId}
          onSelectStackedChild={handleSelectStackedChild}
        />
      }
      onToolbarAction={handleToolbarAction}
      onActivateSession={handleActivateSession}
      resolveRendererView={getRendererView}
    />
  )
}
