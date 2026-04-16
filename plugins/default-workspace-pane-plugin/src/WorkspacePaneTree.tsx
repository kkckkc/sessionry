import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

import type { WorkspaceViewProps } from '@sessionry/plugin-api'
import type { Pane, PaneGroup, PaneGroupChild, WorkspaceStateSnapshot } from '@sessionry/plugin-api'

import { TerminalView } from './TerminalView'

const getNodeId = (child: PaneGroupChild): string =>
  child.kind === 'pane' ? child.paneId : child.paneGroupId

const getPaneTitle = (pane: Pane): string =>
  typeof pane.state.title === 'string' && pane.state.title.length > 0
    ? pane.state.title
    : pane.type === 'terminal'
      ? 'Terminal'
      : pane.type.length > 0
        ? pane.type[0].toUpperCase() + pane.type.slice(1)
        : 'Pane'

const getPaneDescription = (pane: Pane): string | null =>
  typeof pane.state.description === 'string' && pane.state.description.length > 0
    ? pane.state.description
    : null

const getGroupTitle = (paneGroup: PaneGroup): string =>
  paneGroup.name.length > 0 ? paneGroup.name : 'Pane Group'

const getNodeTitle = (
  child: PaneGroupChild,
  paneById: Map<string, Pane>,
  groupById: Map<string, PaneGroup>
): string => {
  if (child.kind === 'pane') {
    const pane = paneById.get(child.paneId)
    return pane ? getPaneTitle(pane) : child.paneId
  }

  const paneGroup = groupById.get(child.paneGroupId)
  return paneGroup ? getGroupTitle(paneGroup) : child.paneGroupId
}

const getPreferredSizeStyle = (preferredSizePct?: number): CSSProperties | undefined =>
  preferredSizePct === undefined
    ? undefined
    : {
        flexBasis: `${preferredSizePct}%`,
        flexGrow: preferredSizePct,
        flexShrink: 1
      }

export const getActiveVisibleTerminalPaneId = (
  snapshot: WorkspaceStateSnapshot,
  sessionId?: string
): string | null => {
  const activeSession = sessionId
    ? snapshot.sessions.find((session) => session.id === sessionId)
    : snapshot.sessions[0]
  if (!activeSession) return null

  const paneById = new Map(snapshot.panes.map((pane) => [pane.id, pane]))
  const groupById = new Map(snapshot.paneGroups.map((paneGroup) => [paneGroup.id, paneGroup]))

  const visitGroup = (paneGroupId: string): string | null => {
    const paneGroup = groupById.get(paneGroupId)
    if (!paneGroup) return null

    const children =
      paneGroup.direction === 'stacked'
        ? paneGroup.children.filter((child) => getNodeId(child) === paneGroup.activeChildId).slice(0, 1)
        : paneGroup.children

    for (const child of children) {
      if (child.kind === 'pane') {
        const pane = paneById.get(child.paneId)
        if (pane?.type === 'terminal') return pane.id
        continue
      }

      const nestedTerminalPaneId = visitGroup(child.paneGroupId)
      if (nestedTerminalPaneId) return nestedTerminalPaneId
    }

    return null
  }

  return visitGroup(activeSession.rootPaneGroupId)
}

interface StackedGroupPanelsProps {
  activeChildId?: string
  children: Array<{
    child: PaneGroupChild
    content: ReactNode
  }>
}

const StackedGroupPanels = ({
  activeChildId,
  children
}: StackedGroupPanelsProps) => {
  const lastFocusedByChildRef = useRef(new Map<string, HTMLElement>())
  const panelByChildRef = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    if (!activeChildId) return

    const panel = panelByChildRef.current.get(activeChildId)
    const lastFocused = lastFocusedByChildRef.current.get(activeChildId)
    if (!panel || !lastFocused || !lastFocused.isConnected || !panel.contains(lastFocused)) return

    const rafId = window.requestAnimationFrame(() => {
      lastFocused.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [activeChildId])

  return (
    <div className="workspace-stacked-content">
      {children.length > 0 ? (
        children.map(({ child, content }) => {
          const childId = getNodeId(child)
          const isActive = activeChildId ? childId === activeChildId : false

          return (
            <div
              key={childId}
              ref={(node) => {
                if (node) {
                  panelByChildRef.current.set(childId, node)
                } else {
                  panelByChildRef.current.delete(childId)
                }
              }}
              className={isActive ? 'workspace-stacked-panel workspace-stacked-panel--active' : 'workspace-stacked-panel'}
              aria-hidden={!isActive}
              onFocusCapture={(event) => {
                if (event.target instanceof HTMLElement) {
                  lastFocusedByChildRef.current.set(childId, event.target)
                }
              }}
            >
              {content}
            </div>
          )
        })
      ) : (
        <section className="workspace-empty">No tab selected.</section>
      )}
    </div>
  )
}

export const WorkspacePaneTree = ({
  snapshot,
  sessionId,
  terminalSession,
  clearSignal,
  activeTerminalPaneId,
  onSelectStackedChild
}: WorkspaceViewProps) => {
  const activeSession = sessionId
    ? snapshot.sessions.find((session) => session.id === sessionId)
    : snapshot.sessions[0]
  const paneById = new Map(snapshot.panes.map((pane) => [pane.id, pane]))
  const groupById = new Map(snapshot.paneGroups.map((paneGroup) => [paneGroup.id, paneGroup]))

  if (!activeSession) {
    return <section className="workspace-empty">No session available.</section>
  }

  const renderPane = (pane: Pane, bare = false, isVisible = true) => {
    const title = getPaneTitle(pane)
    const description = getPaneDescription(pane)
    const isTerminal = pane.type === 'terminal'
    const isLiveTerminal = isTerminal && pane.id === activeTerminalPaneId

    return (
      <article
        key={pane.id}
        className={bare ? 'pane-card pane-card--bare' : 'pane-card'}
        style={getPreferredSizeStyle(pane.preferredSizePct)}
        aria-label={title}
        data-testid={`pane-${pane.id}`}
      >
        {bare ? null : (
          <header className="pane-card__header">
            <div>
              <span className="pane-card__eyebrow">{pane.type}</span>
              <strong>{title}</strong>
            </div>
            {isLiveTerminal ? (
              <div className="pane-card__meta">
                <span>{terminalSession?.id ?? 'loading'}</span>
                <span>{terminalSession?.pid ?? 'pending'}</span>
              </div>
            ) : null}
          </header>
        )}
        <div className="pane-card__body">
          {isTerminal ? (
            <TerminalView session={terminalSession} clearSignal={clearSignal} visible={isVisible} />
          ) : (
            <div className="pane-card__placeholder">
              <p>{description ?? 'Workspace content preview'}</p>
              <span>{isLiveTerminal ? 'Connecting terminal…' : 'Bootstrap pane content'}</span>
            </div>
          )}
        </div>
      </article>
    )
  }

  const renderNode = (child: PaneGroupChild, barePane = false, isVisible = true) =>
    child.kind === 'pane'
      ? renderPane(paneById.get(child.paneId) ?? {
          id: child.paneId,
          sessionId: activeSession.id,
          type: 'unknown',
          state: {}
        }, barePane, isVisible)
      : renderGroup(groupById.get(child.paneGroupId))

  const renderGroup = (paneGroup?: PaneGroup) => {
    if (!paneGroup) {
      return <section className="workspace-empty">Pane group not found.</section>
    }

    const title = getGroupTitle(paneGroup)
    const preferredSizeStyle = getPreferredSizeStyle(paneGroup.preferredSizePct)

    if (paneGroup.direction === 'stacked') {
      const activeChild =
        paneGroup.children.find((child) => getNodeId(child) === paneGroup.activeChildId) ??
        paneGroup.children[0]

      return (
        <section
          key={paneGroup.id}
          className="workspace-node workspace-node--stacked"
          style={preferredSizeStyle}
          aria-label={title}
          data-testid={`group-${paneGroup.id}`}
        >
          <header className="workspace-node__header">
            <span>{title}</span>
            <span>{paneGroup.direction}</span>
          </header>
          <div className="workspace-tabs" role="tablist" aria-label={`${title} tabs`}>
            {paneGroup.children.map((child) => {
              const childId = getNodeId(child)
              const isActive = activeChild ? childId === getNodeId(activeChild) : false
              return (
                <button
                  key={childId}
                  type="button"
                  role="tab"
                  className={isActive ? 'workspace-tab workspace-tab--active' : 'workspace-tab'}
                  aria-selected={isActive}
                  onClick={() => onSelectStackedChild(paneGroup.id, childId)}
                >
                  {getNodeTitle(child, paneById, groupById)}
                </button>
              )
            })}
          </div>
          <StackedGroupPanels
            activeChildId={activeChild ? getNodeId(activeChild) : undefined}
            children={paneGroup.children.map((child) => {
              const childId = getNodeId(child)
              const isActive = activeChild ? childId === getNodeId(activeChild) : false

              return {
                child,
                content: renderNode(child, child.kind === 'pane', isActive)
              }
            })}
          />
        </section>
      )
    }

    return (
      <section
        key={paneGroup.id}
        className={`workspace-node workspace-node--split workspace-node--${paneGroup.direction}`}
        style={preferredSizeStyle}
        aria-label={title}
        data-testid={`group-${paneGroup.id}`}
      >
        <header className="workspace-node__header">
          <span>{title}</span>
          <span>{paneGroup.direction}</span>
        </header>
        <div className={`workspace-split workspace-split--${paneGroup.direction}`}>
          {paneGroup.children.length > 0 ? (
            paneGroup.children.map((child) => renderNode(child))
          ) : (
            <section className="workspace-empty">No panes in this group.</section>
          )}
        </div>
      </section>
    )
  }

  return <div className="workspace-tree">{renderGroup(groupById.get(activeSession.rootPaneGroupId))}</div>
}
