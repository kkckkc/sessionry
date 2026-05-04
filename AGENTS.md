# Repository Guidelines

## Project Structure & Module Organization

Sessionry is a `pnpm` workspace for an Electron app with a plugin-driven UI. Core app code lives in `packages/app`,
shared plugin contracts in `packages/plugin-api`, reusable UI in `packages/components`, and design tokens in
`packages/design-tokens`. Built-in and example plugins live under `plugins/`, typically with `src/`, `test/`,
`tsconfig.json`, and package-local build config. Tests are colocated as `*.test.ts` or `*.test.tsx`.

Importantly, the purpose is to place as much functionality as possible in plugins.

## Build, Test, and Development Commands

Run all commands from the repo root unless a package requires local execution.

- `pnpm install`: install workspace dependencies.
- `pnpm dev`: build the host bundle, then start the Electron app in dev mode.
- `pnpm build`: produce the app build from `packages/app`.
- `pnpm test`: run every package/plugin test script recursively.
- `pnpm typecheck`: run `tsc --noEmit` across workspace packages.
- `pnpm --filter @sessionry/components storybook`: open the component library locally.
- `pnpm --filter @sessionry/sample-plugin deploy`: build and copy the sample plugin to
  `~/sessionry/plugins/sample-plugin`.

## Coding Style & Naming Conventions

The codebase is strict TypeScript with ESM modules, React JSX, and 2-space indentation. Prefer named exports for shared
modules and keep imports grouped logically. Use `PascalCase` for React components, `camelCase` for functions/variables,
and kebab-case package/plugin directories such as `plugin-default-view-terminal`. Keep plugin entry points explicit:
`src/index.ts` for main-process code and `src/renderer.tsx` for renderer views.

## Testing Guidelines

Vitest is the default test runner; renderer tests use `jsdom` and Testing Library. Name tests `*.test.ts` or
`*.test.tsx` beside the code they cover or inside a local `test/` folder. Add coverage for new plugin registration, IPC
behavior, workspace state changes, and renderer interactions where applicable. Run `pnpm test` and `pnpm typecheck`
before opening a PR.

## Commit & Pull Request Guidelines

Recent history uses imperative, sentence-style subjects such as `Add Plugin Manager UI and configuration support`. Keep
commit titles concise, capitalized, and focused on one change. PRs should explain the user-visible impact, note affected
packages/plugins, link any issue, and include screenshots for renderer or styling changes. Mention manual validation
steps when behavior depends on Electron or installed plugins.

## Plugin Workflow Notes

Built-in plugins are wired in `packages/app/src/main/plugins.ts`. User plugins are discovered from
`~/sessionry/plugins`, and each must ship a `plugin.json` manifest with valid `main` and optional `renderer` entries
inside the plugin directory.
