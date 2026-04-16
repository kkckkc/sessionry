import { useEffect, useRef, useState } from 'react'

import type { PluginViewModel, ToolbarActionId } from '@shared/plugins'
import type { TerminalSessionInfo, TerminalStateEvent } from '@shared/terminal'
import type { WorkspaceStateSnapshot } from '@shared/workspace'

import { AppShell } from './components/AppShell'
import { WorkspaceSlotView } from './components/WorkspaceSlotView'
import { getActiveVisibleTerminalPaneId } from './components/WorkspacePaneTree'
import { readWorkspaceSnapshot, workspace } from './lib/workspace'

const emptyPlugins: PluginViewModel = {
  toolbar: [],
  leftPanels: [],
  rightPanels: [],
  statusItems: [],
  viewsBySlot: {}
}

export const App = () => {
  const [plugins, setPlugins] = useState<PluginViewModel>(emptyPlugins)
  const [session, setSession] = useState<TerminalSessionInfo | null>(null)
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<WorkspaceStateSnapshot>(() => readWorkspaceSnapshot())
  const [leftVisible, setLeftVisible] = useState(true)
  const [rightVisible, setRightVisible] = useState(true)
  const [clearSignal, setClearSignal] = useState(0)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    void window.terminalApp.getPluginModel().then(setPlugins)
    void window.terminalApp.createTerminalSession().then(setSession)
    setWorkspaceSnapshot(readWorkspaceSnapshot())

    const unsubscribeState = window.terminalApp.onTerminalState((event: TerminalStateEvent) => {
      setSession({
        id: event.sessionId,
        shell: event.shell,
        cwd: event.cwd,
        pid: event.pid,
        state: event.state
      })
    })
    const unsubscribeWorkspace = workspace.subscribeAll(() => {
      setWorkspaceSnapshot(readWorkspaceSnapshot())
    })

    return () => {
      unsubscribeState()
      unsubscribeWorkspace()
    }
  }, [])

  const activeWorkspaceSessionId = workspaceSnapshot.sessions[0]?.id
  const activeProjectId =
    workspaceSnapshot.sessions.find((session) => session.id === activeWorkspaceSessionId)?.projectId ??
    workspaceSnapshot.projects[0]?.id
  const activeProject =
    activeProjectId !== undefined
      ? workspaceSnapshot.projects.find((project) => project.id === activeProjectId)
      : undefined
  const activeTerminalPaneId = getActiveVisibleTerminalPaneId(workspaceSnapshot, activeWorkspaceSessionId)

  const handleToolbarAction = (action: ToolbarActionId) => {
    switch (action) {
      case 'terminal:new':
        void window.terminalApp.createTerminalSession().then(setSession)
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

  return (
    <AppShell
      plugins={plugins}
      session={session}
      leftVisible={leftVisible}
      rightVisible={rightVisible}
      mainContent={
        <WorkspaceSlotView
          plugins={plugins}
          selectedViewId={activeProject?.activeViews.workspace}
          snapshot={workspaceSnapshot}
          projectId={activeProjectId}
          sessionId={activeWorkspaceSessionId}
          terminalSession={session}
          clearSignal={clearSignal}
          activeTerminalPaneId={activeTerminalPaneId}
          onSelectStackedChild={handleSelectStackedChild}
        />
      }
      onToolbarAction={handleToolbarAction}
    />
  )
}
