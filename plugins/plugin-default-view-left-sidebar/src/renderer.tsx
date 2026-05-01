import './sessions.css'

import { useState, useEffect, type FormEvent } from 'react'
import { Menu } from '@base-ui-components/react/menu'
import {
  Button,
  ConfirmationDialog,
  DialogBackdrop,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogRoot
} from '@sessionry/components'
import type { RendererAppPlugin, SidebarViewProps, Project } from '@sessionry/plugin-api'

import { projectSessionsSidebarPlugin } from '.'

const COLOR_PALETTE = [
  // Row 1
  '#da5597', '#e14f62', '#e87b35', '#e9a23b',
  '#94ca42', '#55b685', '#52b3d0',
  // Row 2
  '#6466e9', '#845eee', '#9d59ef', '#c951e7',
  '#677389', '#77716d', '#2d3748',
]

const getProjectColor = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length]
}

const getProjectDisplayColor = (project: Project): string => {
  return (project.metadata.color as string) || getProjectColor(project.name)
}

const ProjectAvatar = ({ 
  project, 
  onClick 
}: { 
  project: Project
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void 
}) => {
  const color = getProjectDisplayColor(project)
  
  return (
    <button
      type="button"
      className="project-avatar-btn"
      onClick={onClick}
      title="Change project color"
    >
      <span 
        className="project-avatar" 
        style={{ backgroundColor: color }}
      >
        {project.name[0]?.toUpperCase()}
      </span>
    </button>
  )
}

const createSession = async (workspace: SidebarViewProps['workspace'], projectId: string, sessionCount: number) => {
  const project = workspace.getProject(projectId)
  if (!project) return

  const name = `Session ${sessionCount + 1}`
  const session = await project.createSession({ name, folder: project.data.folder })
  await session.createPane({
    type: 'terminal',
    state: { title: 'Terminal' },
    parentPaneGroupId: session.data.rootPaneGroupId
  })
  await session.activate()
}

const openProject = async (workspace: SidebarViewProps['workspace']) => {
  const result = await window.terminalApp.showFolderDialog()
  if (result.canceled || result.filePaths.length === 0) return

  const folder = result.filePaths[0]!
  const name = folder.split(/[\\/]/).filter(Boolean).pop() ?? folder
  
  // Auto-assign a random color from the palette
  const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
  
  await workspace.createProject({ 
    name, 
    folder,
    metadata: { color }
  })
}

interface RenameState {
  type: 'project' | 'session'
  id: string
  name: string
}

interface ContextMenuState extends RenameState {
  anchor: { getBoundingClientRect: () => DOMRect }
}

const RenameDialog = ({
  renameState,
  onClose,
  onRename
}: {
  renameState: RenameState
  onClose: () => void
  onRename: (name: string) => void
}) => {
  const [value, setValue] = useState(renameState.name)
  const title = renameState.type === 'project' ? 'Rename Project' : 'Rename Session'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = value.trim()
    onRename(trimmed || renameState.name)
  }

  return (
    <DialogRoot open onOpenChange={(isOpen: boolean) => { if (!isOpen) onClose() }}>
      <DialogPortal>
        <DialogBackdrop className="dialog-backdrop" />
        <DialogPopup className="dialog rename-dialog">
          <DialogHeader title={title} />
          <form className="rename-dialog-form" onSubmit={handleSubmit}>
            <label className="rename-dialog-field">
              <span>Name</span>
              <input
                className="rename-dialog-input"
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                autoFocus
              />
            </label>
            <div className="rename-dialog-actions">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Rename
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  )
}

interface ColorPickerState {
  projectId: string
  currentColor: string
  anchorElement: HTMLElement
}

const ColorPickerPopup = ({
  currentColor,
  onColorSelect,
  onClose,
  anchorElement
}: {
  currentColor: string
  onColorSelect: (color: string) => void
  onClose: () => void
  anchorElement: HTMLElement
}) => {
  return (
    <Menu.Root open onOpenChange={(isOpen: boolean) => { if (!isOpen) onClose() }}>
      <Menu.Portal>
        <Menu.Positioner
          className="menu-positioner"
          anchor={{ getBoundingClientRect: () => anchorElement.getBoundingClientRect() }}
        >
          <Menu.Popup className="color-picker-popup">
            <div className="color-picker-grid">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  className={`color-swatch ${color === currentColor ? 'is-selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => onColorSelect(color)}
                  aria-label={`Select color ${color}`}
                  type="button"
                />
              ))}
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

const countTerminalPanesInSession = (workspace: SidebarViewProps['workspace'], sessionId: string): number => {
  const paneGroupById = new Map(workspace.snapshot.paneGroups.map((paneGroup) => [paneGroup.id, paneGroup]))
  const paneById = new Map(workspace.snapshot.panes.map((pane) => [pane.id, pane]))
  const session = workspace.snapshot.sessions.find((value) => value.id === sessionId)
  if (!session) return 0

  const visitGroup = (paneGroupId: string): number => {
    const paneGroup = paneGroupById.get(paneGroupId)
    if (!paneGroup) return 0

    return paneGroup.children.reduce((count, child) => {
      if (child.kind === 'pane') {
        return count + (paneById.get(child.paneId)?.type === 'terminal' ? 1 : 0)
      }

      return count + visitGroup(child.paneGroupId)
    }, 0)
  }

  return visitGroup(session.rootPaneGroupId)
}

const ProjectSessionsSidebarView = ({ workspace }: SidebarViewProps) => {
  const [, setRefreshKey] = useState(0)
  const [renameState, setRenameState] = useState<RenameState | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())
  const [colorPicker, setColorPicker] = useState<ColorPickerState | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    intent?: 'primary' | 'danger'
    onConfirm: () => void
  } | null>(null)

  useEffect(() => workspace.subscribeAll(() => setRefreshKey((k) => k + 1)), [workspace])

  const toggleCollapsed = (projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const openContextMenu = (
    event: React.MouseEvent,
    type: 'project' | 'session',
    id: string,
    name: string
  ) => {
    event.preventDefault()
    const { clientX, clientY } = event
    setContextMenu({
      type, id, name,
      anchor: { getBoundingClientRect: () => new DOMRect(clientX, clientY, 0, 0) }
    })
  }

  const openColorPicker = (
    event: React.MouseEvent<HTMLButtonElement>,
    project: Project
  ) => {
    event.stopPropagation()
    setColorPicker({
      projectId: project.id,
      currentColor: getProjectDisplayColor(project),
      anchorElement: event.currentTarget
    })
  }

  const handleColorSelect = async (color: string) => {
    if (!colorPicker) return
    
    const project = workspace.getProject(colorPicker.projectId)
    if (!project) return

    await project.update({
      metadata: {
        ...project.data.metadata,
        color
      }
    })
    
    setColorPicker(null)
  }

  const handleRename = (name: string) => {
    if (!renameState) return
    if (renameState.type === 'project') {
      void workspace.getProject(renameState.id)?.update({ name })
    } else {
      void workspace.getSession(renameState.id)?.update({ name })
    }
    setRenameState(null)
  }

  const handleRemoveSession = async (sessionId: string) => {
    const settings = await window.terminalApp.settings.read()
    
    if (settings.confirmations.confirmSessionClose) {
      const session = workspace.snapshot.sessions.find(s => s.id === sessionId)
      const sessionName = session?.name ?? 'Session'
      
      setConfirmDialog({
        open: true,
        title: 'Close Session',
        message: `Are you sure you want to close "${sessionName}"? All panes in this session will be closed.`,
        intent: 'danger',
        onConfirm: () => {
          void workspace.getSession(sessionId)?.remove()
          setConfirmDialog(null)
        }
      })
      return
    }
    
    void workspace.getSession(sessionId)?.remove()
  }

  return (
    <>
      <div className="sessions">
        <div className="projects-section-header">
          <span className="projects-section-title">Projects</span>
          <button
            type="button"
            className="projects-add-btn"
            title="Open project"
            onClick={() => { void openProject(workspace) }}
          >
            +
          </button>
        </div>
        <ul className="projects-list" aria-label="Project sessions">
          {workspace.snapshot.projects.map((project) => {
            const sessions = project.sessionIds
              .map((sessionId) => workspace.snapshot.sessions.find((session) => session.id === sessionId))
              .filter((session): session is NonNullable<typeof session> => session !== undefined)

            const isCollapsed = collapsedProjects.has(project.id)
            return (
              <li key={project.id} className="project-item">
                <div
                  className="project-header"
                  onContextMenu={(e) => openContextMenu(e, 'project', project.id, project.name)}
                >
                  <ProjectAvatar 
                    project={project}
                    onClick={(e) => openColorPicker(e, project)}
                  />
                  <span 
                    className="project-name"
                    onClick={() => toggleCollapsed(project.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {project.name}
                  </span>
                  <div className="project-slot">
                    <span className="session-count" aria-label={`${sessions.length} sessions`}>{sessions.length}</span>
                    <button
                      type="button"
                      className="session-add-btn"
                      title="New session"
                      onClick={(e) => {
                        e.stopPropagation()
                        void createSession(workspace, project.id, sessions.length)
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className={isCollapsed ? 'sessions-list-wrapper is-collapsed' : 'sessions-list-wrapper'}>
                  <ul className="sessions-list">
                    {sessions.map((session) => {
                      const isActive = session.id === workspace.snapshot.activeSessionId
                      const terminalPaneCount = countTerminalPanesInSession(workspace, session.id)

                      return (
                        <li key={session.id} className={isActive ? 'session-item is-active' : 'session-item'}>
                          <button
                            type="button"
                            className="session-btn"
                            aria-pressed={isActive}
                            onClick={() => {
                              void workspace.getSession(session.id)?.activate()
                            }}
                            onContextMenu={(e) => openContextMenu(e, 'session', session.id, session.name)}
                          >
                            {session.name}
                          </button>
                          <div className="session-slot">
                            <span
                              className="session-pane-count"
                              aria-label={`${terminalPaneCount} terminal panes`}
                            >
                              {terminalPaneCount}
                            </span>
                            <button
                              type="button"
                              className="session-remove-btn"
                              title="Remove session"
                              onClick={() => handleRemoveSession(session.id)}
                            >
                              ×
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
      <Menu.Root
        open={contextMenu !== null}
        onOpenChange={(isOpen: boolean) => { if (!isOpen) setContextMenu(null) }}
      >
        <Menu.Portal>
          <Menu.Positioner
            className="menu-positioner"
            anchor={contextMenu?.anchor}
          >
            <Menu.Popup className="menu-popup">
              <Menu.Item
                className="menu-item"
                onClick={() => {
                  if (!contextMenu) return
                  setRenameState({ type: contextMenu.type, id: contextMenu.id, name: contextMenu.name })
                  setContextMenu(null)
                }}
              >
                Rename
              </Menu.Item>
              {contextMenu?.type === 'project' && (
                <Menu.Item
                  className="menu-item menu-item--danger"
                  onClick={() => {
                    if (!contextMenu) return
                    void workspace.getProject(contextMenu.id)?.remove()
                    setContextMenu(null)
                  }}
                >
                  Close
                </Menu.Item>
              )}
              {contextMenu?.type === 'session' && (
                <Menu.Item
                  className="menu-item menu-item--danger"
                  onClick={() => {
                    if (!contextMenu) return
                    handleRemoveSession(contextMenu.id)
                    setContextMenu(null)
                  }}
                >
                  Remove
                </Menu.Item>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {renameState && (
        <RenameDialog
          renameState={renameState}
          onClose={() => setRenameState(null)}
          onRename={handleRename}
        />
      )}
      {colorPicker && (
        <ColorPickerPopup
          currentColor={colorPicker.currentColor}
          onColorSelect={handleColorSelect}
          onClose={() => setColorPicker(null)}
          anchorElement={colorPicker.anchorElement}
        />
      )}
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

const panelView = projectSessionsSidebarPlugin.views?.[0]

if (!panelView) {
  throw new Error('projectSessionsSidebarPlugin must register a sidebar view.')
}

export const projectSessionsSidebarRendererPlugin: RendererAppPlugin = {
  id: projectSessionsSidebarPlugin.id,
  name: projectSessionsSidebarPlugin.name,
  views: [
    {
      ...panelView,
      component: ProjectSessionsSidebarView
    }
  ]
}

export default projectSessionsSidebarRendererPlugin
