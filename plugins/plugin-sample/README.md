# sample-plugin

A minimal Sessionry plugin template. Copy this directory to start building your own plugin.

## Structure

```
sample-plugin/
├── plugin.json              # Plugin manifest (id, name, version, entry points)
├── src/
│   ├── index.ts             # Main-process entry — exports AppPlugin
│   └── renderer.tsx         # Renderer entry — exports RendererAppPlugin with a React component
├── vite.main.config.ts      # Builds src/index.ts → dist/main.js
└── vite.renderer.config.ts  # Builds src/renderer.tsx → dist/renderer.js
```

## Development

Install dependencies (from the repo root or this directory):

```sh
pnpm install
```

Build and deploy to `~/sessionry/plugins/`:

```sh
pnpm deploy
```

Restart the app to pick up the new plugin.

## How it works

Sessionry loads plugins from `~/sessionry/plugins/`. Each plugin directory must contain a `plugin.json` manifest pointing to its built JavaScript entry files.

**Main process** (`dist/main.js`): Loaded by the Electron main process via a Node.js dynamic `import()`. Declares what views the plugin contributes. No React, no DOM access.

**Renderer** (`dist/renderer.js`): Loaded by the Electron renderer via a dynamic `import()` from the `sessionry://plugin/` protocol. Can import `react`, `react-dom`, `react/jsx-runtime`, and `@sessionry/plugin-api` as bare specifiers — the app's import map resolves them to the host-provided bundles so all plugins share the same React instance.

## Customising

1. Update the `id`, `name`, and `version` in both `plugin.json` and `src/index.ts`.
2. Change the view `title` and `slot` in `src/index.ts` as needed.
3. Replace the `SampleView` component in `src/renderer.tsx` with your UI.
4. Run `pnpm deploy` to rebuild and install.

## Scoped theming

Sessionry renders each plugin view inside a host wrapper with stable data attributes:

```html
<div
  class="plugin-surface"
  data-plugin-id="sample-plugin"
  data-plugin-surface="workspace"
  data-plugin-slot="workspace"
  data-plugin-view-id="sample-plugin.view"
>
  ...
</div>
```

Use that wrapper to scope plugin CSS and token overrides safely:

```css
[data-plugin-id='sample-plugin'] {
  --accent: #ff6b6b;
  --panel-bg: #101418;
}

[data-plugin-id='sample-plugin'] .my-widget {
  color: var(--text-primary);
}
```
