import { useEffect, useRef, useState } from 'react'

import type { PluginViewModel, ToolbarActionId } from '@shared/plugins'
import type { TerminalSessionInfo, TerminalStateEvent } from '@shared/terminal'

import { AppShell } from './components/AppShell'

const emptyPlugins: PluginViewModel = {
  toolbar: [],
  leftPanels: [],
  rightPanels: [],
  statusItems: []
}

export const App = () => {
  const [plugins, setPlugins] = useState<PluginViewModel>(emptyPlugins)
  const [session, setSession] = useState<TerminalSessionInfo | null>(null)
  const [leftVisible, setLeftVisible] = useState(true)
  const [rightVisible, setRightVisible] = useState(true)
  const [clearSignal, setClearSignal] = useState(0)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    void window.terminalApp.getPluginModel().then(setPlugins)
    void window.terminalApp.createTerminalSession().then(setSession)

    const unsubscribeState = window.terminalApp.onTerminalState((event: TerminalStateEvent) => {
      setSession({
        id: event.sessionId,
        shell: event.shell,
        cwd: event.cwd,
        pid: event.pid,
        state: event.state
      })
    })

    return () => {
      unsubscribeState()
    }
  }, [])

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

  return (
    <AppShell
      plugins={plugins}
      session={session}
      clearSignal={clearSignal}
      leftVisible={leftVisible}
      rightVisible={rightVisible}
      onToolbarAction={handleToolbarAction}
    />
  )
}
