import React, { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

import { Tabs } from '@base-ui-components/react/tabs'
import {
  getPaneSlotId,
  resolveActiveView,
  type Pane,
  type PaneGroup,
  type PaneGroupChild,
  type WorkspaceStateSnapshot,
  type WorkspaceViewProps
} from '@sessionry/plugin-api'

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

interface StackedPaneGroupProps {
  paneGroup: PaneGroup
  activeChild?: PaneGroupChild
  paneById: Map<string, Pane>
  groupById: Map<string, PaneGroup>
  preferredSizeStyle?: CSSProperties
  onSelectStackedChild: (paneGroupId: string, childId: string) => void
  renderChild: (child: PaneGroupChild, isActive: boolean) => ReactNode
}

const StackedPaneGroup = ({
  paneGroup,
  activeChild,
  paneById,
  groupById,
  preferredSizeStyle,
  onSelectStackedChild,
  renderChild
}: StackedPaneGroupProps) => {
  const lastFocusedByChildRef = useRef(new Map<string, HTMLElement>())
  const panelByChildRef = useRef(new Map<string, HTMLDivElement>())
  const activeChildId = activeChild ? getNodeId(activeChild) : undefined
  const title = getGroupTitle(paneGroup)

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
    <Tabs.Root
      render={
        <section
          className="workspace-node is-stacked"
          style={preferredSizeStyle}
          aria-label={title}
          data-testid={`group-${paneGroup.id}`}
        />
      }
      value={activeChildId ?? ''}
      onValueChange={(val: string) => onSelectStackedChild(paneGroup.id, val)}
    >
      <header className="header">
        <span>{title}</span>
      </header>
      <Tabs.List className="tab-bar" aria-label={`${title} tabs`}>
        {paneGroup.children.length > 0 ? (
          paneGroup.children.map((child) => {
            const childId = getNodeId(child)
            return (
              <Tabs.Tab key={childId} value={childId} className="tab">
                {getNodeTitle(child, paneById, groupById)}
              </Tabs.Tab>
            )
          })
        ) : (
          <section className="workspace-empty">No tab selected.</section>
        )}
      </Tabs.List>
      <div className="workspace-stacked-content">
        {paneGroup.children.map((child) => {
          const childId = getNodeId(child)
          const isActive = childId === activeChildId
          return (
            <Tabs.Panel
              key={childId}
              value={childId}
              keepMounted
              ref={(node: HTMLDivElement | null) => {
                if (node) panelByChildRef.current.set(childId, node)
                else panelByChildRef.current.delete(childId)
              }}
              className="workspace-stacked-panel"
              onFocusCapture={(event: React.FocusEvent) => {
                if (event.target instanceof HTMLElement) {
                  lastFocusedByChildRef.current.set(childId, event.target)
                }
              }}
            >
              {renderChild(child, isActive)}
            </Tabs.Panel>
          )
        })}
      </div>
    </Tabs.Root>
  )
}

export const WorkspacePaneTree = ({
  plugins,
  snapshot,
  projectId,
  sessionId,
  resolveRendererView,
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

  const renderPane = (pane: Pane, _bare = false, isVisible = true) => {
    const title = getPaneTitle(pane)
    const description = getPaneDescription(pane)
    const isLiveTerminal = pane.type === 'terminal' && pane.id === activeTerminalPaneId
    const paneView = resolveActiveView(plugins, getPaneSlotId(pane.type))
    const paneRenderer = paneView ? resolveRendererView(paneView.id) : null
    const PaneRenderer = paneRenderer?.component

    return (
      <article
        key={pane.id}
        className={'pane is-bare'}
        style={getPreferredSizeStyle(pane.preferredSizePct)}
        aria-label={title}
        data-testid={`pane-${pane.id}`}
      >

        <div className="body">
          {PaneRenderer ? (
            <PaneRenderer
              pane={pane}
              snapshot={snapshot}
              projectId={projectId}
              sessionId={sessionId}
              terminalSession={terminalSession}
              clearSignal={clearSignal}
              activeTerminalPaneId={activeTerminalPaneId}
              visible={isVisible}
            />
          ) : (
            <div className="placeholder">
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
        <StackedPaneGroup
          key={paneGroup.id}
          paneGroup={paneGroup}
          activeChild={activeChild}
          paneById={paneById}
          groupById={groupById}
          preferredSizeStyle={preferredSizeStyle}
          onSelectStackedChild={onSelectStackedChild}
          renderChild={(child, isActive) => renderNode(child, child.kind === 'pane', isActive)}
        />
      )
    }

    return (
      <section
        key={paneGroup.id}
        className="workspace-node is-split"
        style={preferredSizeStyle}
        aria-label={title}
        data-testid={`group-${paneGroup.id}`}
      >
        <header className="header">
          <span>{title}</span>
        </header>
        <div className={`workspace-split is-${paneGroup.direction}`}>
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
