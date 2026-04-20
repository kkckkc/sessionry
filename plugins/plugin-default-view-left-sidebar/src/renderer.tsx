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

const ProjectSessionsSidebarView = ({
  workspace
}: SidebarViewProps) => (
  <div className="sessions">
    <ul className="projects-list" aria-label="Project sessions">
      {workspace.snapshot.projects.map((project) => {
        const sessions = project.sessionIds
          .map((sessionId) => workspace.snapshot.sessions.find((session) => session.id === sessionId))
          .filter((session): session is NonNullable<typeof session> => session !== undefined)

        return (
          <li key={project.id} className="project-item">
            <div className="project-header">
              <ProjectAvatar name={project.name} />
              <span className="project-name">{project.name}</span>
              <span className="session-count">({sessions.length})</span>
            </div>
            <ul className="sessions-list">
              {sessions.map((session) => {
                const isActive = session.id === workspace.snapshot.activeSessionId
                return (
                  <li key={session.id}>
                    <button
                      type="button"
                      className={isActive ? 'session-btn is-active' : 'session-btn'}
                      aria-pressed={isActive}
                      onClick={() => {
                        void workspace.getSession(session.id)?.activate()
                      }}
                    >
                      {session.name}
                    </button>
                  </li>
                )
              })}
            </ul>
          </li>
        )
      })}
    </ul>
  </div>
)

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
