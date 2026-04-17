# Sessionry

Sessionry is an Electron app for project and terminal sessions with a plugin-driven UI. The repo is a pnpm workspace containing the desktop app, the shared plugin API, and a small set of built-in/example plugins.

## Workspace layout

```text
.
├── packages/
│   ├── app/         # Electron app host, renderer, plugin loading, workspace state
│   └── plugin-api/  # Shared types and helpers used by the host and plugins
└── plugins/
    ├── plugin-default-view-workspace/
    ├── plugin-default-view-left-sidebar/
    ├── plugin-default-view-terminal/
    └── sample-plugin/
```

## Development

Install dependencies:

```sh
pnpm install
```

Start the app in development:

```sh
pnpm dev
```

Other useful commands:

```sh
pnpm test
pnpm typecheck
pnpm build
```

## Plugin system

Sessionry treats most UI contributions as plugins. A plugin can contribute:

- views, attached to named slots such as `workspace`, `pane:terminal`, or `sidebar:left`
- actions for the toolbar/palette
- status items
- main-process activation logic through `activateMain(context)`

The shared types for these contributions live in [`packages/plugin-api`](./packages/plugin-api/README.md).

### Built-in vs user plugins

There are two plugin sources:

- built-in plugins, imported directly by the app from this monorepo
- user-installed plugins, loaded at runtime from `~/sessionry/plugins`

Built-in plugins are registered in [`packages/app/src/main/plugins.ts`](/Users/magnusjohansson/Documents/Private/projects/sessionry/packages/app/src/main/plugins.ts). User plugins are discovered by [`packages/app/src/main/pluginLoader.ts`](/Users/magnusjohansson/Documents/Private/projects/sessionry/packages/app/src/main/pluginLoader.ts).

### User plugin layout

Each installed plugin lives in its own directory under `~/sessionry/plugins/<dir>` and must contain a `plugin.json` manifest:

```json
{
  "id": "sample-plugin",
  "name": "Sample Plugin",
  "version": "0.1.0",
  "main": "dist/main.js",
  "renderer": "dist/renderer.js"
}
```

- `main` is required and must export a default `AppPlugin`
- `renderer` is optional and should export a default `RendererAppPlugin`
- the host validates that declared entry points stay inside the plugin directory before importing them

### Loading flow

1. The Electron main process scans `~/sessionry/plugins`.
2. For each plugin with a valid `plugin.json`, it imports the `main` bundle.
3. Built-in and user plugins are merged into one plugin model.
4. The host normalizes contributions into slot/grouped view data for the renderer.
5. If a plugin declares a `renderer` bundle, the renderer imports it through the custom `sessionry://plugin/...` protocol and registers its React view components.

The custom protocol is implemented in [`packages/app/src/main/index.ts`](/Users/magnusjohansson/Documents/Private/projects/sessionry/packages/app/src/main/index.ts). It serves:

- `sessionry://plugin/...` for user plugin assets
- `sessionry://host/...` for host-provided shared modules

## Plugin mechanisms

### View slots

Plugins register views into slot IDs. Current helpers in the API include:

- `workspace`
- `getPaneSlotId(paneType)` which produces values like `pane:terminal`
- `getSidebarSlotId(side)` which produces values like `sidebar:left`

Multiple plugins can contribute to the same slot. The host picks the active view by:

1. selected view id
2. preferred view id
3. first contribution marked `isDefault`
4. first contribution in the slot

### Actions

Actions are declared with metadata plus a `run(...)` handler. The host strips the handler when building the renderer-facing model, then executes the real handler in the main process through the action registry.

Action descriptors support:

- placement on `toolbar` and/or `palette`
- typed arguments
- context-derived arguments such as `activeProjectId`
- client effects like toggling layout or clearing/restarting the active terminal

### Workspace API

Plugins receive a `workspace` API in `activateMain(context)`. It exposes a typed model for:

- projects
- sessions
- pane groups
- panes
- subscriptions to workspace events

This is the main integration surface for plugins that need to create, update, or react to session layout/state.

## Writing a plugin

The quickest starting point is [`plugins/sample-plugin`](plugins/plugin-default-view-workspace/README.md). It shows the minimum shape:

- `src/index.ts`: main-process plugin definition
- `src/renderer.tsx`: renderer plugin definition with React components
- `vite.main.config.ts` and `vite.renderer.config.ts`: separate builds for each side

At the moment, renderer-side support is centered on view registration. The `RendererPluginContext` and `activateRenderer` type exist in `@sessionry/plugin-api`, but the current app wiring does not invoke `activateRenderer`; renderer bundles are loaded for their exported views.

## Notes

- The plugin API package is source-exported inside the workspace, so internal packages import from `@sessionry/plugin-api` without a publish step.
- User plugins are currently loaded from a local directory, not from an in-app marketplace or signed package format.
