import React, { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'

import { TbLayoutColumns, TbLayoutRows } from 'react-icons/tb'
import { Dialog } from '@base-ui-components/react/dialog'
import { Tabs } from '@base-ui-components/react/tabs'
import { Menu } from '@base-ui-components/react/menu'
import {
  resolveActiveView,
  type Pane,
  type PaneGroup,
  type PaneGroupChild,
  type PaneGroupLayout,
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

const GROUP_TYPES: Array<{ value: PaneGroupLayout; label: string }> = [
  { value: 'stacked', label: 'Stacked (Tabs)' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' }
]

interface PaneGroupHeaderProps {
  paneGroup: PaneGroup
  groupChild: PaneGroupChild | null
  onRenameGroup: (paneGroupId: string, currentName: string) => void
  onChangeGroupType: (paneGroupId: string, direction: PaneGroupLayout) => void
  onAddTerminalPane: (paneGroupId: string) => void
  onRemovePaneNode: (node: PaneGroupChild) => void
  title?: ReactNode
  wrapInHeader?: boolean
  className?: string
}

const PaneGroupActions = ({
  paneGroup,
  groupChild,
  onRenameGroup,
  onChangeGroupType,
  onAddTerminalPane,
  onRemovePaneNode,
  className
}: Omit<PaneGroupHeaderProps, 'title' | 'wrapInHeader'>) => {
  const isTabBar = className?.includes('tab-bar-actions') ?? false
  const menuTriggerClassName = isTabBar ? 'group-menu-trigger tab-bar-action' : 'group-menu-trigger'
  const iconButtonClassName = isTabBar
    ? 'tab-bar-action tab-bar-action--glyph'
    : undefined

  return (
    <div className={className ?? 'header-actions pane-group-actions'}>
      <Menu.Root>
        <Menu.Trigger
          render={<button type="button" className={menuTriggerClassName} aria-label="Group options" />}
        >
          ···
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="menu-positioner" align="end">
            <Menu.Popup className="menu-popup">
              <Menu.Item
                className="menu-item"
                onClick={() => onRenameGroup(paneGroup.id, paneGroup.name)}
              >
                Rename
              </Menu.Item>
              <Menu.SubmenuRoot>
                <Menu.SubmenuTrigger className="menu-item menu-item--has-submenu">
                  Change Type
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner className="menu-positioner">
                    <Menu.Popup className="menu-popup">
                      {GROUP_TYPES.filter((t) => t.value !== paneGroup.direction).map((t) => (
                        <Menu.Item
                          key={t.value}
                          className="menu-item"
                          onClick={() => onChangeGroupType(paneGroup.id, t.value)}
                        >
                          {t.label}
                        </Menu.Item>
                      ))}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <button
        type="button"
        className={isTabBar ? `group-add ${iconButtonClassName}` : 'group-add'}
        aria-label="New terminal pane"
        onClick={() => onAddTerminalPane(paneGroup.id)}
      >
        +
      </button>
      {groupChild && (
        <button
          type="button"
          className={isTabBar ? `group-close ${iconButtonClassName}` : 'group-close'}
          aria-label="Close pane group"
          onClick={() => onRemovePaneNode(groupChild)}
        >
          ×
        </button>
      )}
    </div>
  )
}

const PaneGroupHeader = ({
  paneGroup,
  groupChild,
  onRenameGroup,
  onChangeGroupType,
  onAddTerminalPane,
  onRemovePaneNode,
  title = <span>{getGroupTitle(paneGroup)}</span>,
  wrapInHeader = true,
  className
}: PaneGroupHeaderProps) => {
  const actions = (
    <PaneGroupActions
      paneGroup={paneGroup}
      groupChild={groupChild}
      onRenameGroup={onRenameGroup}
      onChangeGroupType={onChangeGroupType}
      onAddTerminalPane={onAddTerminalPane}
      onRemovePaneNode={onRemovePaneNode}
      className={wrapInHeader ? 'header-actions pane-group-actions' : className}
    />
  )

  if (!wrapInHeader) return actions

  return (
    <header className="header">
      {title}
      {actions}
    </header>
  )
}

interface StackedPaneGroupProps {
  paneGroup: PaneGroup
  groupChild: PaneGroupChild | null
  activeChild?: PaneGroupChild
  paneById: Map<string, Pane>
  groupById: Map<string, PaneGroup>
  preferredSizeStyle?: CSSProperties
  onSelectStackedChild: (paneGroupId: string, childId: string) => void
  onRemovePaneNode: (node: PaneGroupChild) => void
  onAddTerminalPane: (paneGroupId: string) => void
  onSplitPane: (paneId: string, direction: 'horizontal' | 'vertical') => void
  onRenameGroup: (paneGroupId: string, name: string) => void
  onChangeGroupType: (paneGroupId: string, direction: PaneGroupLayout) => void
  renderChild: (child: PaneGroupChild, isActive: boolean) => ReactNode
}

const StackedPaneGroup = ({
  paneGroup,
  groupChild,
  activeChild,
  paneById,
  groupById,
  preferredSizeStyle,
  onSelectStackedChild,
  onRemovePaneNode,
  onAddTerminalPane,
  onSplitPane,
  onRenameGroup,
  onChangeGroupType,
  renderChild
}: StackedPaneGroupProps) => {
  const lastFocusedByChildRef = useRef(new Map<string, HTMLElement>())
  const panelByChildRef = useRef(new Map<string, HTMLDivElement>())
  const activeChildId = activeChild ? getNodeId(activeChild) : undefined
  const activePaneId = activeChild?.kind === 'pane' ? activeChild.paneId : null
  const activeGroup = activeChild?.kind === 'group' ? groupById.get(activeChild.paneGroupId) : null
  const activeSplitGroup =
    activeChild?.kind === 'group' && activeGroup && activeGroup.direction !== 'stacked'
      ? activeGroup
      : null
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
      <PaneGroupHeader
        paneGroup={paneGroup}
        groupChild={groupChild}
        onRenameGroup={onRenameGroup}
        onChangeGroupType={onChangeGroupType}
        onAddTerminalPane={onAddTerminalPane}
        onRemovePaneNode={onRemovePaneNode}
      />
      <div className="tab-bar-row">
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
        {activePaneId && (
          <div className="tab-bar-actions">
            <button
              type="button"
              className="tab-bar-action"
              aria-label="Split horizontal"
              onClick={() => onSplitPane(activePaneId, 'horizontal')}
            >
              <TbLayoutColumns size={14} />
            </button>
            <button
              type="button"
              className="tab-bar-action"
              aria-label="Split vertical"
              onClick={() => onSplitPane(activePaneId, 'vertical')}
            >
              <TbLayoutRows size={14} />
            </button>
          </div>
        )}
        {activeSplitGroup && (
          <PaneGroupHeader
            paneGroup={activeSplitGroup}
            groupChild={activeChild}
            onRenameGroup={onRenameGroup}
            onChangeGroupType={onChangeGroupType}
            onAddTerminalPane={onAddTerminalPane}
            onRemovePaneNode={onRemovePaneNode}
            wrapInHeader={false}
            className="tab-bar-actions pane-group-actions"
          />
        )}
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

const RenameGroupDialog = ({
  paneGroupName,
  onClose,
  onRename
}: {
  paneGroupName: string
  onClose: () => void
  onRename: (name: string) => void
}) => {
  const [value, setValue] = useState(paneGroupName)

  useEffect(() => {
    setValue(paneGroupName)
  }, [paneGroupName])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onRename(value.trim() || paneGroupName)
  }

  return (
    <Dialog.Root open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup className="dialog">
          <header className="header">
            <Dialog.Title>Rename Pane Group</Dialog.Title>
          </header>
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                autoFocus
              />
            </label>
            <div className="actions">
              <button type="button" className="btn is-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn">
                Rename
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const WorkspacePaneTree = ({
  plugins,
  workspace,
  resolveRendererView,
  clearSignal
}: WorkspaceViewProps) => {
  const snapshot = workspace.snapshot
  const [renameGroup, setRenameGroup] = useState<{ paneGroupId: string; name: string } | null>(null)
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

  const handleRemovePaneNode = (node: PaneGroupChild) => {
    void workspace.getPaneGroup(activeSession.rootPaneGroupId)?.removeNode(node)
  }

  const handleRenameGroup = (paneGroupId: string, currentName: string) => {
    setRenameGroup({ paneGroupId, name: currentName })
  }

  const commitRenameGroup = (name: string) => {
    if (!renameGroup) return

    void workspace.getPaneGroup(renameGroup.paneGroupId)?.update({ name })
    setRenameGroup(null)
  }

  const handleChangeGroupType = (paneGroupId: string, direction: PaneGroupLayout) => {
    void workspace.getPaneGroup(paneGroupId)?.update({ direction })
  }

  const handleSplitPane = (paneId: string, direction: 'horizontal' | 'vertical') => {
    void workspace.getPane(paneId)?.split(direction)
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

  const renderPane = (pane: Pane, child: PaneGroupChild | null = null, isVisible = true) => {
    const title = getPaneTitle(pane)
    const description = getPaneDescription(pane)
    const isLiveTerminal = pane.type === 'terminal' && pane.id === activeTerminalPaneId
    const paneView = resolveActiveView(plugins, `pane:${pane.type}`)
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
        {child && (
          <div className="pane-actions">
            <button
              type="button"
              className="pane-action"
              aria-label="Split horizontal"
              onClick={() => handleSplitPane(pane.id, 'horizontal')}
            >
              <TbLayoutColumns size={13} />
            </button>
            <button
              type="button"
              className="pane-action"
              aria-label="Split vertical"
              onClick={() => handleSplitPane(pane.id, 'vertical')}
            >
              <TbLayoutRows size={13} />
            </button>
            <button
              type="button"
              className="pane-action"
              aria-label="Close pane"
              onClick={() => handleRemovePaneNode(child)}
            >
              ×
            </button>
          </div>
        )}
        <div className="body">
          {PaneRenderer ? (
            <PaneRenderer
              plugins={plugins}
              workspace={workspace}
              resolveRendererView={resolveRendererView}
              pane={pane}
              clearSignal={clearSignal}
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

  const renderNode = (child: PaneGroupChild, inStack = false, isVisible = true) =>
    child.kind === 'pane'
      ? renderPane(paneById.get(child.paneId) ?? {
          id: child.paneId,
          sessionId: activeSession.id,
          type: 'unknown',
          state: {}
        }, inStack ? null : child, isVisible)
      : renderGroup(groupById.get(child.paneGroupId), child, inStack)

  const renderGroup = (
    paneGroup?: PaneGroup,
    groupChild: PaneGroupChild | null = null,
    inStack = false
  ) => {
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
          groupChild={groupChild}
          activeChild={activeChild}
          paneById={paneById}
          groupById={groupById}
          preferredSizeStyle={preferredSizeStyle}
          onSelectStackedChild={handleSelectStackedChild}
          onRemovePaneNode={handleRemovePaneNode}
          onAddTerminalPane={handleAddTerminalPane}
          onSplitPane={handleSplitPane}
          onRenameGroup={handleRenameGroup}
          onChangeGroupType={handleChangeGroupType}
          renderChild={(child, isActive) => renderNode(child, true, isActive)}
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
        {!inStack && (
          <PaneGroupHeader
            paneGroup={paneGroup}
            groupChild={groupChild}
            onRenameGroup={handleRenameGroup}
            onChangeGroupType={handleChangeGroupType}
            onAddTerminalPane={handleAddTerminalPane}
            onRemovePaneNode={handleRemovePaneNode}
          />
        )}
        <div className={`workspace-split is-${paneGroup.direction}`}>
          {paneGroup.children.length > 0 ? (
            paneGroup.children.flatMap((child, index) => {
              const node = renderNode(child)
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
      {renameGroup && (
        <RenameGroupDialog
          paneGroupName={renameGroup.name}
          onClose={() => setRenameGroup(null)}
          onRename={commitRenameGroup}
        />
      )}
    </>
  )
}
