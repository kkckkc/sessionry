import type { RendererAppPlugin, SidebarViewProps } from '@sessionry/plugin-api'

import { projectSessionsSidebarPlugin } from '.'

const ProjectSessionsSidebarView = ({
  snapshot,
  activeSessionId,
  onActivateSession
}: SidebarViewProps) => (
  <div className="sessions">
    <ul className="list" aria-label="Project sessions">
      {snapshot.projects.map((project) => {
        const sessions = project.sessionIds
          .map((sessionId) => snapshot.sessions.find((session) => session.id === sessionId))
          .filter((session): session is NonNullable<typeof session> => session !== undefined)

        return (
          <li key={project.id}>
            <div className="project">{project.name}</div>
            <ul className="list">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId

                return (
                  <li key={session.id}>
                    <button
                      type="button"
                      className={isActive ? 'is-active' : undefined}
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
