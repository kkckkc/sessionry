# Code Editor Plugin

A CodeMirror-based code editor plugin for Sessionry that provides syntax highlighting and editing capabilities for various file types.

## Features

- **Multi-language Support**: JavaScript, TypeScript, JSX, TSX, JSON, CSS, HTML, Markdown, YAML
- **Theme Integration**: Automatically syncs with terminal theme system
- **Auto-save**: Save files with `Cmd/Ctrl+S`
- **Dirty State Tracking**: Visual indicator for unsaved changes
- **Focus Management**: Integrates with Sessionry's focus system

## Theme System

The code editor is fully integrated with Sessionry's terminal theme system, ensuring visual consistency across the application.

### Supported Themes

The editor automatically adapts to all terminal themes:
- **default** - Custom blue-tinted dark theme
- **dracula** - Popular Dracula theme
- **one-dark** - Atom One Dark
- **solarized-dark** - Solarized Dark
- **github-dark** - GitHub Dark

### Dynamic Theme Switching

The editor responds to theme changes in real-time:
- Light/Dark mode switching
- Terminal theme changes
- Custom background color overrides

### CSS Variables Used

The editor uses the following CSS variables from the design token system:

| Variable | Purpose |
|----------|---------|
| `--workspace-bg` | Editor background |
| `--term-fg` | Default text color |
| `--term-cursor` | Cursor color |
| `--term-selection` | Selection background |
| `--hover` | Active line background |
| `--border-subtle` | Gutter background |
| `--border` | Gutter border |
| `--term-magenta` | Keywords (if, else, function, etc.) |
| `--term-blue` | Function names, headings, links |
| `--term-yellow` | Types, classes, numbers |
| `--term-green` | Strings, inserted text |
| `--term-cyan` | Constants, operators, atoms |
| `--term-bright-black` | Comments (italic) |
| `--term-red` | Invalid/error syntax |

### Syntax Highlighting

The editor includes comprehensive syntax highlighting that maps semantic token types to terminal colors:

- **Keywords** (if, else, function, class, etc.) → Magenta
- **Function names** → Blue
- **Types & Classes** → Yellow
- **Strings** → Green
- **Numbers & Constants** → Cyan
- **Comments** → Bright Black (italic)
- **Operators** → Cyan
- **Invalid syntax** → Red

This ensures that syntax highlighting is consistent with the terminal theme and automatically updates when themes change.

### Implementation Details

The theme system works through:

1. **CSS Variables**: Base colors are defined in `styles.css` using CSS variables that reference the terminal theme system
2. **Dynamic Theme Extension**: A CodeMirror theme extension is created by reading computed CSS variable values
3. **MutationObserver**: Watches for changes to `class` and `data-terminal-theme` attributes on `document.documentElement`
4. **Theme Reconfiguration**: When theme changes are detected, the editor is reconfigured with updated theme values

This approach ensures:
- Zero-latency theme updates
- Consistency with terminal appearance
- Support for both light and dark modes
- Compatibility with all named terminal themes

## Usage

The plugin is automatically loaded by Sessionry. To open a file in the code editor:

1. Use the file browser to navigate to a file
2. Click on a supported file type
3. The file will open in a new code pane

### Keyboard Shortcuts

- `Cmd/Ctrl+S` - Save file

## Development

### File Structure

```
plugin-default-view-code/
├── src/
│   ├── index.ts          # Plugin definition
│   ├── renderer.tsx      # React component and theme logic
│   └── styles.css        # Editor styles with CSS variables
├── package.json
└── README.md
```

### Adding Language Support

To add support for a new language:

1. Install the CodeMirror language package
2. Import it in `renderer.tsx`
3. Add a case to the `languageExtension` useMemo hook

Example:
```typescript
import { python } from '@codemirror/lang-python'

// In languageExtension useMemo:
case '.py':
  return python()
```

### Customizing Theme Colors

To customize editor colors, modify the CSS variables in `packages/design-tokens/src/tokens.css`. The editor will automatically pick up the changes.

## Technical Notes

- Uses CodeMirror 6 with `basicSetup` for core functionality
- Theme updates use `EditorView.reconfigure` for smooth transitions
- File operations are handled through the Sessionry IPC bridge
- The editor maintains a reference to saved content for dirty state tracking
