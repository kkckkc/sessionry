# @sessionry/plugin-api

Shared types and helpers for Sessionry plugins and for the host code that loads them.

This package defines the contract between:

- the Electron main process
- the renderer
- built-in plugins in this repo
- user plugins loaded from `~/sessionry/plugins`

## What this package contains

- plugin contribution types such as `AppPlugin`, `RendererAppPlugin`, `PluginViewDefinition`, and `SidebarViewProps`
- action types and execution contracts
- workspace data structures, commands, events, and handles
- bridge types used by the renderer preload/host boundary
- normalization helpers that turn raw plugin contributions into a renderer-friendly `PluginViewModel`

Exports are re-exported from [`src/index.ts`](/Users/magnusjohansson/Documents/Private/projects/sessionry/packages/plugin-api/src/index.ts).

## Core plugin model

The main entry point for plugin authors is `AppPlugin`:

```ts
export interface AppPlugin {
  id: string
  name: string
  actions?: ActionContribution[]
  statusItems?: StatusItemContribution[]
  views?: PluginViewDefinition[]
  activateMain?: (context: MainPluginContext) => void | Promise<void>
  activateRenderer?: (context: RendererPluginContext) => void | Promise<void>
}
```

In practice today:

- `activateMain` is used by the host
- renderer bundles are loaded for their `views`
- `activateRenderer` exists in the type surface but is not currently called by the app

If a plugin ships renderer React components, it should export a `RendererAppPlugin`, which extends view definitions with a `component`.

## Contribution types

### Views

Views are declared with:

- `id`: stable view identifier
- `slot`: host-defined placement target
- `title`: UI label
- `isDefault`: optional default selection within a slot

Plugins can also set `viewMode: 'multi-view'` to claim a slot as a container view. If multiple plugins target the same slot and one or more of them use `multi-view`, the first such plugin in registration order wins that slot and renders the switching UI for the ordinary child views in the slot.

Useful slot IDs:

- `pane:<type>` e.g. `pane:terminal`
- `sidebar:left` or `sidebar:right`

The host groups views by slot and resolves the active view with `resolveActiveView(...)`.
Use `getChildViewsForSlot(...)` or `resolveChildViewForSlot(...)` when a multi-view host needs the ordinary child views for a slot.
Sidebar surfaces are also just slot views, typically attached to `sidebar:left` or `sidebar:right`.

### Actions

Actions combine metadata and executable behavior:

- `ActionDescriptor` is the serializable description the renderer sees
- `ActionContribution` adds the `run(context, args)` handler used in the main process

The action model supports:

- toolbar and palette surfaces
- default keybindings
- typed and prompted arguments
- context-derived arguments
- structured completion results and client effects

## Workspace model

`workspace.ts` defines the persistent entities and command/event system that plugins work against:

- `Project`
- `Session`
- `PaneGroup`
- `Pane`

`WorkspaceApi` is built on top of that lower-level command model. It gives plugins typed handles for reading and mutating the current workspace while keeping snapshots cloned and frozen before exposure.

Typical plugin interactions include:

- creating a project or session
- adding panes or pane groups
- updating metadata or active views
- subscribing to workspace events

The bridge implementation lives in [`src/workspaceApi.ts`](/Users/magnusjohansson/Documents/Private/projects/sessionry/packages/plugin-api/src/workspaceApi.ts).

## Normalization

The host does not hand raw plugin objects to the renderer. Instead it calls `normalizePlugins(...)` from [`src/pluginRegistry.ts`](/Users/magnusjohansson/Documents/Private/projects/sessionry/packages/plugin-api/src/pluginRegistry.ts), which builds a `PluginViewModel`:

- actions without executable handlers
- toolbar action ids
- status items
- `viewsBySlot`

This keeps the renderer-side model serializable and focused on UI selection/rendering.

## Renderer bridge

`src/rendererBridge.ts` defines the `TerminalAppBridge` contract exposed to the renderer. It includes:

- terminal session lifecycle and I/O
- plugin model loading
- user renderer bundle discovery
- action listing and execution
- workspace read/command/event access

User plugin renderer bundles are discovered by the main process, then imported by the renderer through `sessionry://plugin/...`.

## Minimal plugin example

The sample plugin in [`plugins/sample-plugin`](/Users/magnusjohansson/Documents/Private/projects/sessionry/plugins/sample-plugin/README.md) is the reference starting point. Its pattern is:

1. Export a default `AppPlugin` from `src/index.ts`.
2. Optionally export a default `RendererAppPlugin` from `src/renderer.tsx`.
3. Point `plugin.json` at the built `main` and `renderer` files.

Minimal main-process plugin:

```ts
import type { AppPlugin } from '@sessionry/plugin-api'

const plugin: AppPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  views: [
    {
      id: 'my-plugin.view',
      title: 'My View',
      slot: 'workspace'
    }
  ]
}

export default plugin
```

Minimal renderer plugin:

```tsx
import type { RendererAppPlugin } from '@sessionry/plugin-api'
import plugin from './index.js'

function MyView() {
  return <div>My plugin UI</div>
}

export default {
  ...plugin,
  views: [
    {
      ...plugin.views![0],
      component: MyView
    }
  ]
} satisfies RendererAppPlugin
```

## Relationship to the app package

This package is only the contract layer. Actual loading/execution lives in `packages/app`:

- plugin discovery: [`packages/app/src/main/pluginLoader.ts`](/Users/magnusjohansson/Documents/Private/projects/sessionry/packages/app/src/main/pluginLoader.ts)
- plugin activation/model assembly: [`packages/app/src/main/pluginManager.ts`](/Users/magnusjohansson/Documents/Private/projects/sessionry/packages/app/src/main/pluginManager.ts)
- renderer-side renderer bundle registration: [`packages/app/src/renderer/src/plugins/index.ts`](/Users/magnusjohansson/Documents/Private/projects/sessionry/packages/app/src/renderer/src/plugins/index.ts)
