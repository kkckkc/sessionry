# Code Pane Plugin

A plugin for viewing and editing code files in Sessionry with syntax highlighting powered by CodeMirror 6.

## Features

- **Syntax Highlighting**: Support for multiple languages including TypeScript, JavaScript, JSON, CSS, HTML, Markdown, and YAML
- **Theme Integration**: Automatically adapts to the active theme with semantic token colors
- **Auto-save**: Save files with `Cmd/Ctrl+S`
- **Dirty State Tracking**: Visual indicator for unsaved changes
- **Read-only Mode**: Support for viewing files without editing
- **Markdown Preview**: Toggle between edit and preview modes for markdown files

## Markdown Preview

When viewing markdown files (`.md`), you can toggle between edit and preview modes:

### Toggle Methods

1. **Icon Button**: Click the eye/edit icon in the pane title bar
   - Eye icon (👁️): Switch to preview mode
   - Edit icon (✏️): Switch to edit mode

2. **Keyboard Shortcut**: Press `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows/Linux)

### Preview Features

- **GitHub Flavored Markdown (GFM)**: Full support for tables, task lists, strikethrough, and more
- **Syntax Highlighting**: Code blocks are highlighted using the same theme as the editor
- **Theme Integration**: Preview styling automatically adapts to the active theme
- **Responsive**: Properly handles large documents with smooth scrolling

### Supported Markdown Features

- Headings (H1-H6)
- Paragraphs and line breaks
- Bold, italic, and strikethrough text
- Ordered and unordered lists
- Task lists (checkboxes)
- Code blocks with syntax highlighting
- Inline code
- Links and images
- Blockquotes
- Horizontal rules
- Tables
- HTML (sanitized for security)

## Usage

The code pane is automatically used when opening supported file types. The view mode (edit/preview) is persisted per-pane, so different panes can have different modes.

## Supported Languages

- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)
- JSON (`.json`)
- CSS (`.css`)
- HTML (`.html`)
- Markdown (`.md`)
- YAML (`.yml`, `.yaml`)

## Development

```bash
# Type check
pnpm --filter @sessionry/plugin-default-view-code typecheck
```

## Dependencies

- **CodeMirror 6**: Modern code editor
- **react-markdown**: Markdown rendering
- **remark-gfm**: GitHub Flavored Markdown support
- **rehype-highlight**: Syntax highlighting for code blocks
- **react-icons**: UI icons