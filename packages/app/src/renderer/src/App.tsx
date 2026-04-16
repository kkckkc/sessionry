import { useEffect, useRef, useState, type FormEvent } from 'react'

import type {
  ActionExecutionResult,
  ActionInputSpec,
  ActionInvocationSource,
  PluginViewModel,
  TerminalSessionInfo,
  TerminalStateEvent,
  WorkspaceStateSnapshot
} from '@sessionry/plugin-api'
import { getActiveVisibleTerminalPaneId } from '@sessionry/default-workspace-pane-plugin/renderer'

import { AppShell } from './components/AppShell'
import { createActionKeydownHandler } from './lib/keybindings'
import { WorkspaceSlotView } from './components/WorkspaceSlotView'
import { readWorkspaceSnapshot, workspace } from './lib/workspace'
import { getRendererView, loadUserPluginRenderers } from './plugins'

const emptyPlugins: PluginViewModel = {
  actions: [],
  toolbarActionIds: [],
  leftPanels: [],
  rightPanels: [],
  statusItems: [],
  viewsBySlot: {}
}

interface PendingActionState {
  result: Extract<ActionExecutionResult, { status: 'needs-input' }>
  source: ActionInvocationSource
}

const getEntityOptions = (snapshot: WorkspaceStateSnapshot, spec: ActionInputSpec) => {
  if (spec.options) return spec.options

  switch (spec.entityType) {
    case 'project':
      return snapshot.projects.map((project) => ({ value: project.id, label: project.name }))
    case 'session':
      return snapshot.sessions.map((session) => ({ value: session.id, label: session.name }))
    case 'paneGroup':
      return snapshot.paneGroups.map((paneGroup) => ({ value: paneGroup.id, label: paneGroup.name }))
    case 'pane':
      return snapshot.panes.map((pane) => ({ value: pane.id, label: pane.id }))
    default:
      return []
  }
}

const toFormValue = (spec: ActionInputSpec, value: unknown): string | boolean => {
  if (spec.type === 'boolean') return value === true
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return ''
}

const fromFormValue = (spec: ActionInputSpec, value: unknown): unknown => {
  if (spec.type === 'boolean') {
    return value === true
  }

  if (typeof value !== 'string') return value
  if (spec.type === 'number') {
    return value.trim().length === 0 ? undefined : Number(value)
  }

  return value
}

const ActionDialog = ({
  pending,
  snapshot,
  onCancel,
  onSubmit
}: {
  pending: PendingActionState
  snapshot: WorkspaceStateSnapshot
  onCancel: () => void
  onSubmit: (args: Record<string, unknown>) => void
}) => {
  const { action, resolvedArgs } = pending.result
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})

  useEffect(() => {
    setFormValues(
      Object.fromEntries(
        (action.args ?? []).map((spec) => [spec.name, toFormValue(spec, resolvedArgs[spec.name])])
      )
    )
  }, [action.args, resolvedArgs])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(
      Object.fromEntries(
        (action.args ?? []).map((spec) => [spec.name, fromFormValue(spec, formValues[spec.name] ?? resolvedArgs[spec.name])])
      )
    )
  }

  return (
    <div className="action-dialog-backdrop">
      <div className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title">
        <header className="action-dialog__header">
          <h2 id="action-dialog-title">{action.name}</h2>
          {action.description ? <p>{action.description}</p> : null}
        </header>
        <form className="action-dialog__form" onSubmit={handleSubmit}>
          {(action.args ?? [])
            .filter((spec) => !spec.hidden)
            .map((spec) => {
              const value = formValues[spec.name] ?? ''
              const options = spec.type === 'enum' || spec.type === 'entity-ref' ? getEntityOptions(snapshot, spec) : []

              return (
                <label key={spec.name} className="action-dialog__field">
                  <span>{spec.label}</span>
                  {spec.type === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={value === true}
                      onChange={(inputEvent) =>
                        setFormValues((current) => ({ ...current, [spec.name]: inputEvent.target.checked }))
                      }
                    />
                  ) : spec.type === 'enum' || spec.type === 'entity-ref' ? (
                    <select
                      value={typeof value === 'string' ? value : ''}
                      onChange={(inputEvent) =>
                        setFormValues((current) => ({ ...current, [spec.name]: inputEvent.target.value }))
                      }
                    >
                      <option value="">Select…</option>
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={spec.type === 'number' ? 'number' : 'text'}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(inputEvent) =>
                        setFormValues((current) => ({ ...current, [spec.name]: inputEvent.target.value }))
                      }
                    />
                  )}
                  {spec.description ? <small>{spec.description}</small> : null}
                </label>
              )
            })}
          <div className="action-dialog__actions">
            <button type="button" className="action-dialog__button action-dialog__button--ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="action-dialog__button">
              Run
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export const App = () => {
  const [plugins, setPlugins] = useState<PluginViewModel>(emptyPlugins)
  const [terminalSessions, setTerminalSessions] = useState<Record<string, TerminalSessionInfo>>({})
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<WorkspaceStateSnapshot>(() => readWorkspaceSnapshot())
  const [leftVisible, setLeftVisible] = useState(true)
  const [rightVisible, setRightVisible] = useState(true)
  const [clearSignal, setClearSignal] = useState(0)
  const [pendingAction, setPendingAction] = useState<PendingActionState | null>(null)
  const initializedRef = useRef(false)

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

  const executeAction = (actionId: string, source: ActionInvocationSource, args?: Record<string, unknown>) => {
    void window.terminalApp.actions.execute({ actionId, source, args }).then((result) => {
      if (result.status === 'needs-input') {
        setPendingAction({ result, source })
        return
      }

      setPendingAction(null)

      for (const effect of result.effects ?? []) {
        switch (effect.type) {
          case 'layout.toggle-left':
            setLeftVisible((value) => !value)
            break
          case 'layout.toggle-right':
            setRightVisible((value) => !value)
            break
          case 'terminal.clear-active':
            setClearSignal((value) => value + 1)
            break
          case 'terminal.restart-active': {
            const paneId =
              typeof effect.payload?.paneId === 'string' ? effect.payload.paneId : activeTerminalPaneId ?? undefined
            if (!paneId) break

            void window.terminalApp
              .createTerminalSession({
                sessionId: paneId,
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
          }
          default:
            break
        }
      }
    })
  }

  useEffect(() => {
    const handleKeydown = createActionKeydownHandler(plugins.actions, (actionId) =>
      executeAction(actionId, 'shortcut')
    )

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [activeTerminalPaneId, activeWorkspaceSessionId, plugins.actions, workspaceSnapshot.sessions])

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
      dialog={
        pendingAction ? (
          <ActionDialog
            pending={pendingAction}
            snapshot={workspaceSnapshot}
            onCancel={() => setPendingAction(null)}
            onSubmit={(args) => executeAction(pendingAction.result.action.id, pendingAction.source, args)}
          />
        ) : null
      }
      onToolbarAction={(actionId) => executeAction(actionId, 'toolbar')}
      onActivateSession={handleActivateSession}
      resolveRendererView={getRendererView}
    />
  )
}
