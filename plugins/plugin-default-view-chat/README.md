# Chat Pane Plugin

A native plugin for Sessionry that adds chat functionality through a new pane type.

## Overview

This plugin introduces:
- A new pane type: `chat`
- A "New Chat" action accessible via the Cmd-K command palette
- A chat view component (currently displaying placeholder content)

## Structure

```
plugin-default-view-chat/
├── package.json                 # Dependencies and build scripts
├── tsconfig.json                # TypeScript configuration
├── vite.main.config.ts          # Main process build config
├── vite.renderer.config.ts      # Renderer process build config
├── README.md                    # This file
└── src/
    ├── index.ts                 # Main plugin entry point
    └── renderer.tsx             # Renderer plugin entry point
```

## Building

From the repository root:

```bash
pnpm --filter @sessionry/plugin-default-view-chat build
```

Or from the plugin directory:

```bash
cd plugins/plugin-default-view-chat
pnpm build
```

## Usage

1. Build the plugin (see above)
2. Start Sessionry: `pnpm dev` from the repository root
3. Open the command palette with `Cmd-K` (macOS) or `Ctrl-K` (Windows/Linux)
4. Search for "New Chat"
5. Execute the action to create a new chat pane

## Development

The plugin follows Sessionry's plugin architecture:

- **Main Process** (`src/index.ts`): Defines the plugin metadata, actions, and views
- **Renderer Process** (`src/renderer.tsx`): Implements the React components for the UI

### Action Flow

1. User invokes "New Chat" via command palette
2. Action returns a `pane.new-chat` effect
3. App processes the effect and dispatches a `sessionry:new-chat` event
4. WorkspacePaneTree listens for the event and creates a new pane with type `chat`
5. The ChatView component is rendered in the new pane

## Future Enhancements

- Implement actual chat functionality
- Add AI/LLM integration
- Support chat history and persistence
- Add settings for chat configuration
- Support multiple concurrent chat sessions

## License

Same as Sessionry
