import './sessions.css'

import { useState, useEffect, type FormEvent } from 'react'
import { Menu } from '@base-ui-components/react/menu'
import { Dialog } from '@base-ui-components/react/dialog'
import type { RendererAppPlugin, SidebarViewProps } from '@sessionry/plugin-api'

import { projectSessionsSidebarPlugin } from '.'

const PROJECT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

const getProjectColor = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length]
}

const ProjectAvatar = ({ name }: { name: string }) => (
  <span className="project-avatar" style={{ backgroundColor: getProjectColor(name) }}>
    {name[0]?.toUpperCase()}
  </span>
)

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
  await workspace.createProject({ name, folder })
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
    <Dialog.Root open onOpenChange={(isOpen: boolean) => { if (!isOpen) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup className="dialog">
          <header className="header">
            <Dialog.Title>{title}</Dialog.Title>
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

const ProjectSessionsSidebarView = ({ workspace }: SidebarViewProps) => {
  const [, setRefreshKey] = useState(0)
  const [renameState, setRenameState] = useState<RenameState | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())

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

  const handleRename = (name: string) => {
    if (!renameState) return
    if (renameState.type === 'project') {
      void workspace.getProject(renameState.id)?.update({ name })
    } else {
      void workspace.getSession(renameState.id)?.update({ name })
    }
    setRenameState(null)
  }

  const handleRemoveSession = (sessionId: string) => {
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
                  <button
                    type="button"
                    className="project-avatar-btn"
                    title={isCollapsed ? 'Expand project' : 'Collapse project'}
                    onClick={() => toggleCollapsed(project.id)}
                  >
                    <ProjectAvatar name={project.name} />
                  </button>
                  <span className="project-name">{project.name}</span>
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
                          <button
                            type="button"
                            className="session-remove-btn"
                            title="Remove session"
                            onClick={() => handleRemoveSession(session.id)}
                          >
                            ×
                          </button>
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
    </>
  )
}

const panelView = projectSessionsSidebarPlugin.views?.[0]

if (!panelView) {
  throw new Error('projectSessionsSidebarPlugin must register a sidebar view.')
}

export const projectSessionsSidebarRendererPlugin: RendererAppPlugin = {
  ...projectSessionsSidebarPlugin,
  views: [
    {
      ...panelView,
      component: ProjectSessionsSidebarView
    }
  ]
}

export default projectSessionsSidebarRendererPlugin
