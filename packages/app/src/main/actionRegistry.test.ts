import { describe, expect, it, vi } from 'vitest'

import { createWorkspaceApi, type AppPlugin } from '@sessionry/plugin-api'
import { terminalPanePlugin } from '@sessionry/terminal-pane-plugin'

import { ActionRegistry } from './actionRegistry'
import { WorkspaceStore } from './workspaceStore'

const createRegistry = (plugins: AppPlugin[]) => {
  const workspaceStore = new WorkspaceStore()
  const workspace = createWorkspaceApi({
    read: () => workspaceStore.read(),
    executeCommand: (command) => workspaceStore.executeCommand(command),
    subscribeAll: (listener) => workspaceStore.subscribeAll(listener)
  })

  return {
    workspaceStore,
    registry: new ActionRegistry(plugins, workspace, () => workspaceStore.read())
  }
}

describe('ActionRegistry', () => {
  it('registers action metadata and exposes toolbar-visible actions', () => {
    const { registry } = createRegistry([
      {
        id: 'test.plugin',
        name: 'Test Plugin',
        actions: [
          {
            id: 'layout:toggle-left',
            name: 'Toggle Left Sidebar',
            surfaces: ['toolbar'],
            run: () => ({ status: 'completed' })
          }
        ]
      }
    ])

    expect(registry.list()).toEqual([
      {
        id: 'layout:toggle-left',
        name: 'Toggle Left Sidebar',
        surfaces: ['toolbar']
      }
    ])
  })

  it('rejects duplicate action ids', () => {
    expect(() =>
      createRegistry([
        {
          id: 'one',
          name: 'One',
          actions: [{ id: 'duplicate', name: 'Duplicate', run: () => ({ status: 'completed' }) }]
        },
        {
          id: 'two',
          name: 'Two',
          actions: [{ id: 'duplicate', name: 'Duplicate Again', run: () => ({ status: 'completed' }) }]
        }
      ])
    ).toThrow(/already registered/i)
  })

  it('returns missing input after resolving context defaults', async () => {
    const run = vi.fn()
    const { registry } = createRegistry([
      {
        id: 'sessions',
        name: 'Sessions',
        actions: [
          {
            id: 'session:create',
            name: 'Create Session',
            args: [
              {
                name: 'projectId',
                label: 'Project',
                type: 'entity-ref',
                entityType: 'project',
                required: true,
                fromContext: 'activeProjectId'
              },
              {
                name: 'name',
                label: 'Session name',
                type: 'string',
                required: true
              }
            ],
            run
          }
        ]
      }
    ])

    const result = await registry.execute({ actionId: 'session:create', source: 'toolbar' })

    expect(result).toEqual({
      status: 'needs-input',
      action: {
        id: 'session:create',
        name: 'Create Session',
        args: [
          {
            name: 'projectId',
            label: 'Project',
            type: 'entity-ref',
            entityType: 'project',
            required: true,
            fromContext: 'activeProjectId'
          },
          {
            name: 'name',
            label: 'Session name',
            type: 'string',
            required: true
          }
        ]
      },
      providedArgs: {},
      resolvedArgs: { projectId: 'project-primary' },
      missing: [{ name: 'name', label: 'Session name', type: 'string', required: true }]
    })
    expect(run).not.toHaveBeenCalled()
  })

  it('executes actions after required args are provided and can mutate workspace', async () => {
    const { registry, workspaceStore } = createRegistry([
      {
        id: 'sessions',
        name: 'Sessions',
        actions: [
          {
            id: 'session:create',
            name: 'Create Session',
            args: [
              {
                name: 'projectId',
                label: 'Project',
                type: 'entity-ref',
                entityType: 'project',
                required: true,
                fromContext: 'activeProjectId'
              },
              {
                name: 'name',
                label: 'Session name',
                type: 'string',
                required: true
              }
            ],
            run: async (context, args) => {
              const projectId = String(args.projectId)
              const project = context.workspace.getProject(projectId)
              if (!project) throw new Error('missing project')
              await project.createSession({ name: String(args.name), folder: project.data.folder })
              return { status: 'completed' }
            }
          }
        ]
      }
    ])

    const result = await registry.execute({
      actionId: 'session:create',
      source: 'toolbar',
      args: { name: 'Planning' }
    })

    expect(result).toEqual({ status: 'completed' })
    expect(workspaceStore.read().sessions.some((session) => session.name === 'Planning')).toBe(true)
  })

  it('creates a usable terminal session from the built-in create session action', async () => {
    const { registry, workspaceStore } = createRegistry([terminalPanePlugin])

    const result = await registry.execute({
      actionId: 'session:create',
      source: 'toolbar',
      args: { name: 'Planning' }
    })

    expect(result).toEqual({ status: 'completed' })

    const snapshot = workspaceStore.read()
    const createdSession = snapshot.sessions.find((session) => session.name === 'Planning')
    expect(createdSession).toBeDefined()
    expect(snapshot.activeSessionId).toBe(createdSession?.id)

    const rootPaneGroup = snapshot.paneGroups.find((paneGroup) => paneGroup.id === createdSession?.rootPaneGroupId)
    expect(rootPaneGroup).toBeDefined()
    expect(rootPaneGroup?.direction).toBe('stacked')
    expect(rootPaneGroup?.children).toHaveLength(1)

    const childPaneId =
      rootPaneGroup?.children[0]?.kind === 'pane' ? rootPaneGroup.children[0].paneId : undefined
    expect(rootPaneGroup?.activeChildId).toBe(childPaneId)

    const pane = snapshot.panes.find((candidate) => candidate.id === childPaneId)
    expect(pane).toMatchObject({
      sessionId: createdSession?.id,
      type: 'terminal',
      state: {
        title: 'Terminal'
      }
    })
  })
})
