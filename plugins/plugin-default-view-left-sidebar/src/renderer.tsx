import type { RendererAppPlugin, SidebarPanelViewProps } from '@sessionry/plugin-api'

import { projectSessionsSidebarPlugin } from './index.js'

const ProjectSessionsSidebarView = ({
  snapshot,
  activeSessionId,
  onActivateSession
}: SidebarPanelViewProps) => (
  <ul className="sidebar-panel__list" aria-label="Project sessions">
    {snapshot.projects.map((project) => {
      const sessions = project.sessionIds
        .map((sessionId) => snapshot.sessions.find((session) => session.id === sessionId))
        .filter((session): session is NonNullable<typeof session> => session !== undefined)

      return (
        <li key={project.id}>
          <div className="sidebar-project-label">{project.name}</div>
          <ul className="sidebar-panel__list">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId

              return (
                <li key={session.id}>
                  <button
                    type="button"
                    className={isActive ? 'sidebar-session-button sidebar-session-button--active' : 'sidebar-session-button'}
                    aria-pressed={isActive}
                    onClick={() => onActivateSession(session.id)}
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
)

const panelView = projectSessionsSidebarPlugin.views?.[0]

if (!panelView) {
  throw new Error('projectSessionsSidebarPlugin must register a sidebar panel view.')
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
