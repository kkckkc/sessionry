import React, { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { TbLayoutColumns, TbLayoutRows, TbLayoutNavbar } from 'react-icons/tb'
import { Tabs } from '@base-ui-components/react/tabs'
import { PaneTitle, ConfirmationDialog } from '@sessionry/components'
import {
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

interface PaneResizeHandleProps {
  direction: 'horizontal' | 'vertical'
  prevChild: PaneGroupChild
  nextChild: PaneGroupChild
  onResizeDone: (updates: Array<{ kind: 'pane' | 'group'; id: string; preferredSizePct: number }>) => void
}

const PaneResizeHandle = ({ direction, prevChild, nextChild, onResizeDone }: PaneResizeHandleProps) => {
  const handleRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()

      const handle = handleRef.current
      if (!handle) return

      const prevEl = handle.previousElementSibling as HTMLElement | null
      const nextEl = handle.nextElementSibling as HTMLElement | null
      const container = handle.parentElement
      if (!prevEl || !nextEl || !container) return

      const isHorizontal = direction === 'horizontal'
      const startPos = isHorizontal ? e.clientX : e.clientY
      const prevRect = prevEl.getBoundingClientRect()
      const nextRect = nextEl.getBoundingClientRect()
      const prevStartSize = isHorizontal ? prevRect.width : prevRect.height
      const nextStartSize = isHorizontal ? nextRect.width : nextRect.height
      const totalSize = prevStartSize + nextStartSize
      const minSize = 50

      document.body.style.cursor = isHorizontal ? 'ew-resize' : 'ns-resize'
      document.body.style.userSelect = 'none'

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = (isHorizontal ? moveEvent.clientX : moveEvent.clientY) - startPos
        let newPrevSize = prevStartSize + delta
        let newNextSize = nextStartSize - delta

        if (newPrevSize < minSize) {
          newPrevSize = minSize
          newNextSize = totalSize - minSize
        } else if (newNextSize < minSize) {
          newNextSize = minSize
          newPrevSize = totalSize - minSize
        }

        prevEl.style.flexBasis = `${newPrevSize}px`
        prevEl.style.flexGrow = '0'
        nextEl.style.flexBasis = `${newNextSize}px`
        nextEl.style.flexGrow = '0'
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''

        const containerRect = container.getBoundingClientRect()
        const availableSize = isHorizontal ? containerRect.width : containerRect.height

        const prevFinalRect = prevEl.getBoundingClientRect()
        const nextFinalRect = nextEl.getBoundingClientRect()
        const prevFinalSize = isHorizontal ? prevFinalRect.width : prevFinalRect.height
        const nextFinalSize = isHorizontal ? nextFinalRect.width : nextFinalRect.height

        const toId = (child: PaneGroupChild) =>
          child.kind === 'pane' ? child.paneId : child.paneGroupId
        const toKind = (child: PaneGroupChild): 'pane' | 'group' =>
          child.kind === 'pane' ? 'pane' : 'group'

        onResizeDone([
          { kind: toKind(prevChild), id: toId(prevChild), preferredSizePct: (prevFinalSize / availableSize) * 100 },
          { kind: toKind(nextChild), id: toId(nextChild), preferredSizePct: (nextFinalSize / availableSize) * 100 }
        ])
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [direction, prevChild, nextChild, onResizeDone]
  )

  return (
    <div
      ref={handleRef}
      className={`workspace-resize-handle is-${direction}`}
      onMouseDown={handleMouseDown}
    />
  )
}

const getPreferredSizeStyle = (preferredSizePct?: number): CSSProperties | undefined =>
  preferredSizePct === undefined
    ? undefined
    : {
        flexBasis: `${preferredSizePct}%`,
        flexGrow: preferredSizePct,
        flexShrink: 1
      }

const hasStackedDescendant = (
  child: PaneGroupChild,
  groupById: Map<string, PaneGroup>
): boolean => {
  if (child.kind === 'pane') return false

  const paneGroup = groupById.get(child.paneGroupId)
  if (!paneGroup) return false
  if (paneGroup.direction === 'stacked') return true

  return paneGroup.children.some((nestedChild) => hasStackedDescendant(nestedChild, groupById))
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
  nestedInStackedPaneGroup?: boolean
  onSelectStackedChild: (paneGroupId: string, childId: string) => void
  onRemovePaneNode: (node: PaneGroupChild) => void
  onRemovePaneGroup: (paneGroupId: string) => void
  onAddTerminalPane: (paneGroupId: string) => void
  onSplitPaneGroup: (paneGroupId: string, direction: 'horizontal' | 'vertical') => void
  renderChild: (child: PaneGroupChild, isActive: boolean) => ReactNode
}

const StackedPaneGroup = ({
  paneGroup,
  activeChild,
  paneById,
  groupById,
  preferredSizeStyle,
  nestedInStackedPaneGroup = false,
  onSelectStackedChild,
  onRemovePaneNode,
  onRemovePaneGroup,
  onAddTerminalPane,
  onSplitPaneGroup,
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
      <div className={`tab-bar-row${nestedInStackedPaneGroup ? ' is-nested-stacked-pane-group' : ''}`}>
        <Tabs.List className="tab-bar" aria-label={`${title} tabs`}>
          {paneGroup.children.map((child) => {
            const childId = getNodeId(child)
            return (
              <Tabs.Tab key={childId} value={childId} className="tab">
                <span>{getNodeTitle(child, paneById, groupById)}</span>
                <span
                  className="tab-close"
                  role="button"
                  aria-label="Close tab"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemovePaneNode(child)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      onRemovePaneNode(child)
                    }
                  }}
                >
                  ×
                </span>
              </Tabs.Tab>
            )
          })}
        </Tabs.List>
        <button
          type="button"
          className="tab-bar-action tab-bar-action--glyph"
          aria-label="New tab"
          onClick={() => onAddTerminalPane(paneGroup.id)}
        >
          +
        </button>
        <div className="tab-bar-actions">
          <button
            type="button"
            className="tab-bar-action"
            aria-label="Split horizontal"
            onClick={() => onSplitPaneGroup(paneGroup.id, 'horizontal')}
          >
            <TbLayoutColumns size={14} />
          </button>
          <button
            type="button"
            className="tab-bar-action"
            aria-label="Split vertical"
            onClick={() => onSplitPaneGroup(paneGroup.id, 'vertical')}
          >
            <TbLayoutRows size={14} />
          </button>
          <button
            type="button"
            className="tab-bar-action"
            aria-label="Close pane group"
            onClick={() => onRemovePaneGroup(paneGroup.id)}
          >
            ×
          </button>
        </div>
      </div>
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
  workspace,
  resolveRendererView,
  clearSignal
}: WorkspaceViewProps) => {
  const [, setRefreshKey] = useState(0)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    intent?: 'primary' | 'danger'
    onConfirm: () => void
  } | null>(null)

  useEffect(() => workspace.subscribeAll(() => setRefreshKey((k) => k + 1)), [workspace])

  const snapshot = workspace.snapshot
  const activeSession = snapshot.activeSessionId
    ? snapshot.sessions.find((session) => session.id === snapshot.activeSessionId)
    : snapshot.sessions[0]
  const paneById = new Map(snapshot.panes.map((pane) => [pane.id, pane]))
  const groupById = new Map(snapshot.paneGroups.map((paneGroup) => [paneGroup.id, paneGroup]))
  const activeTerminalPaneId = getActiveVisibleTerminalPaneId(snapshot, activeSession?.id)

  if (!activeSession) {
    return <section className="workspace-empty">No session available.</section>
  }

  const handleSelectStackedChild = (paneGroupId: string, childId: string) => {
    void workspace.getPaneGroup(paneGroupId)?.update({ activeChildId: childId })
  }

  const handleResizePaneNodes = (
    updates: Array<{ kind: 'pane' | 'group'; id: string; preferredSizePct: number }>
  ) => {
    for (const update of updates) {
      if (update.kind === 'pane') {
        void workspace.getPane(update.id)?.update({ preferredSizePct: update.preferredSizePct })
      } else {
        void workspace.getPaneGroup(update.id)?.update({ preferredSizePct: update.preferredSizePct })
      }
    }
  }

  const handleRemovePaneNode = async (node: PaneGroupChild) => {
    // Check if confirmation is needed for panes
    if (node.kind === 'pane') {
      const settings = await window.terminalApp.settings.read()
      
      if (settings.confirmations.confirmPaneClose) {
        const pane = paneById.get(node.paneId)
        const title = pane ? getPaneTitle(pane) : 'Pane'
        
        setConfirmDialog({
          open: true,
          title: 'Close Pane',
          message: `Are you sure you want to close "${title}"?`,
          intent: 'danger',
          onConfirm: () => {
            void workspace.getPaneGroup(activeSession.rootPaneGroupId)?.removeNode(node)
            setConfirmDialog(null)
          }
        })
        return
      }
    }
    
    void workspace.getPaneGroup(activeSession.rootPaneGroupId)?.removeNode(node)
  }



  const handleSplitPane = (paneId: string, direction: 'horizontal' | 'vertical') => {
    void workspace.getPane(paneId)?.split(direction)
  }

  const handleRemovePaneGroup = async (paneGroupId: string) => {
    const settings = await window.terminalApp.settings.read()
    
    if (settings.confirmations.confirmPaneGroupClose) {
      const paneGroup = groupById.get(paneGroupId)
      const title = paneGroup ? getGroupTitle(paneGroup) : 'Pane Group'
      const childCount = paneGroup?.children.length ?? 0
      
      setConfirmDialog({
        open: true,
        title: 'Close Pane Group',
        message: `Are you sure you want to close "${title}"? This will close ${childCount} ${childCount === 1 ? 'pane' : 'panes'}.`,
        intent: 'danger',
        onConfirm: () => {
          void workspace.getPaneGroup(activeSession.rootPaneGroupId)?.removeNode({ kind: 'group', paneGroupId })
          setConfirmDialog(null)
        }
      })
      return
    }
    
    void workspace.getPaneGroup(activeSession.rootPaneGroupId)?.removeNode({ kind: 'group', paneGroupId })
  }

  const handleSplitPaneGroup = async (paneGroupId: string, direction: 'horizontal' | 'vertical') => {
    const paneGroup = workspace.getPaneGroup(paneGroupId)
    if (!paneGroup) return

    await paneGroup.split(direction)
  }

  const handleConvertToTabs = (paneId: string) => {
    void workspace.getPane(paneId)?.convertToTabs()
  }

  const handleAddTerminalPane = (paneGroupId: string) => {
    void workspace.getSession(activeSession.id)?.createPane({
      type: 'terminal',
      state: { title: 'Terminal' },
      parentPaneGroupId: paneGroupId
    }).then((pane) => {
      void workspace.getPaneGroup(paneGroupId)?.update({ activeChildId: pane.id })
    })
  }

  const renderPane = (
    pane: Pane,
    child: PaneGroupChild | null = null,
    isVisible = true,
    withStackedGroupTitleBalance = false,
    nestedInStackedPaneGroup = false
  ) => {
    const title = getPaneTitle(pane)
    const description = getPaneDescription(pane)
    const isLiveTerminal = pane.type === 'terminal' && pane.id === activeTerminalPaneId
    const paneView = resolveActiveView(plugins, `pane:${pane.type}`)
    const paneRenderer = paneView ? resolveRendererView(paneView.id) : null
    const PaneRenderer = paneRenderer?.component

    const handleTitleClick = () => {
      // DOM-based focus for panes
      const paneElement = document.querySelector(`[data-testid="pane-${pane.id}"] .body`)
      if (paneElement instanceof HTMLElement) {
        const focusable = paneElement.querySelector<HTMLElement>('input, textarea, [tabindex]:not([tabindex="-1"])')
        if (focusable) {
          focusable.focus()
        } else {
          paneElement.focus()
        }
      }
    }

    return (
      <article
        key={pane.id}
        className={'pane is-bare'}
        style={getPreferredSizeStyle(pane.preferredSizePct)}
        aria-label={title}
        data-testid={`pane-${pane.id}`}
      >
        {withStackedGroupTitleBalance ? (
          <div
            className={`workspace-title-balance${nestedInStackedPaneGroup ? ' is-nested-stacked-pane-group' : ''}`}
            aria-hidden="true"
          />
        ) : null}
        <PaneTitle
          title={title}
          onClick={handleTitleClick}
          actions={
            child ? (
              <>
                <button
                  type="button"
                  aria-label="Split horizontal"
                  onClick={() => handleSplitPane(pane.id, 'horizontal')}
                >
                  <TbLayoutColumns size={13} />
                </button>
                <button
                  type="button"
                  aria-label="Split vertical"
                  onClick={() => handleSplitPane(pane.id, 'vertical')}
                >
                  <TbLayoutRows size={13} />
                </button>
                <button
                  type="button"
                  aria-label="Convert to tabs"
                  onClick={() => handleConvertToTabs(pane.id)}
                >
                  <TbLayoutNavbar size={13} />
                </button>
                <button
                  type="button"
                  aria-label="Close pane"
                  onClick={() => handleRemovePaneNode(child)}
                >
                  ×
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="Split horizontal"
                  onClick={() => handleSplitPane(pane.id, 'horizontal')}
                >
                  <TbLayoutColumns size={13} />
                </button>
                <button
                  type="button"
                  aria-label="Split vertical"
                  onClick={() => handleSplitPane(pane.id, 'vertical')}
                >
                  <TbLayoutRows size={13} />
                </button>
                <button
                  type="button"
                  aria-label="Convert to tabs"
                  onClick={() => handleConvertToTabs(pane.id)}
                >
                  <TbLayoutNavbar size={13} />
                </button>
              </>
            )
          }
        />
        <div className="body">
          {PaneRenderer ? (
            <div
              className="plugin-surface"
              data-plugin-id={paneView?.pluginId}
              data-plugin-surface="pane"
              data-plugin-slot={paneView?.slot}
              data-plugin-view-id={paneView?.id}
            >
              <PaneRenderer
                plugins={plugins}
                workspace={workspace}
                resolveRendererView={resolveRendererView}
                pane={pane}
                clearSignal={clearSignal}
                visible={isVisible}
              />
            </div>
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

  const renderNode = (
    child: PaneGroupChild,
    inStack = false,
    isVisible = true,
    withStackedGroupTitleBalance = false,
    nestedInStackedPaneGroup = false
  ) =>
    child.kind === 'pane'
      ? renderPane(paneById.get(child.paneId) ?? {
          id: child.paneId,
          sessionId: activeSession.id,
          type: 'unknown',
          state: {}
        }, inStack ? null : child, isVisible, withStackedGroupTitleBalance, nestedInStackedPaneGroup)
      : renderGroup(groupById.get(child.paneGroupId), withStackedGroupTitleBalance, nestedInStackedPaneGroup)

  const renderGroup = (
    paneGroup?: PaneGroup,
    withStackedGroupTitleBalance = false,
    nestedInStackedPaneGroup = false
  ) => {
    if (!paneGroup) {
      return <section className="workspace-empty">Pane group not found.</section>
    }

    const title = getGroupTitle(paneGroup)
    const preferredSizeStyle = getPreferredSizeStyle(paneGroup.preferredSizePct)

    if (paneGroup.direction === 'stacked') {
      const activeChild =
        paneGroup.children.find((child) => getNodeId(child) === paneGroup.activeChildId) ??
        paneGroup.children[0] ??
        null

      return (
        <StackedPaneGroup
          key={paneGroup.id}
          paneGroup={paneGroup}
          activeChild={activeChild}
          paneById={paneById}
          groupById={groupById}
          preferredSizeStyle={preferredSizeStyle}
          nestedInStackedPaneGroup={nestedInStackedPaneGroup}
          onSelectStackedChild={handleSelectStackedChild}
          onRemovePaneNode={handleRemovePaneNode}
          onRemovePaneGroup={handleRemovePaneGroup}
          onAddTerminalPane={handleAddTerminalPane}
          onSplitPaneGroup={handleSplitPaneGroup}
          renderChild={(child, isActive) => renderNode(child, true, isActive, false, true)}
        />
      )
    }

    const shouldBalanceChildren =
      paneGroup.direction === 'horizontal' && paneGroup.children.some((child) => hasStackedDescendant(child, groupById))

    return (
      <section
        key={paneGroup.id}
        className="workspace-node is-split"
        style={preferredSizeStyle}
        aria-label={title}
        data-testid={`group-${paneGroup.id}`}
      >
        {withStackedGroupTitleBalance ? (
          <div
            className={`workspace-title-balance${nestedInStackedPaneGroup ? ' is-nested-stacked-pane-group' : ''}`}
            aria-hidden="true"
          />
        ) : null}
        <div className={`workspace-split is-${paneGroup.direction}`}>
          {paneGroup.children.length > 0 ? (
            paneGroup.children.flatMap((child, index) => {
              const node = renderNode(
                child,
                false,
                true,
                shouldBalanceChildren && !hasStackedDescendant(child, groupById),
                nestedInStackedPaneGroup
              )
              if (index === 0) return [node]
              const prevChild = paneGroup.children[index - 1]
              return [
                <PaneResizeHandle
                  key={`resize-${getNodeId(prevChild)}-${getNodeId(child)}`}
                  direction={paneGroup.direction as 'horizontal' | 'vertical'}
                  prevChild={prevChild}
                  nextChild={child}
                  onResizeDone={handleResizePaneNodes}
                />,
                node
              ]
            })
          ) : (
            <section className="workspace-empty">No panes in this group.</section>
          )}
        </div>
      </section>
    )
  }

  return (
    <>
      <div className="workspace-tree">{renderGroup(groupById.get(activeSession.rootPaneGroupId))}</div>
      {confirmDialog && (
        <ConfirmationDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          intent={confirmDialog.intent}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </>
  )
}
