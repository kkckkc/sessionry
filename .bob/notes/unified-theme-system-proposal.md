# Unified Theme System Proposal

## Problem Statement

Currently, the theme system has significant duplication and architectural issues:

1. **Duplication**: `TERMINAL_THEMES` is defined in two places:
   - `plugins/plugin-default-view-terminal/src/TerminalPaneView.tsx`
   - `plugins/plugin-default-view-code/src/renderer.tsx`

2. **Terminal-Centric Design**: The concept is "terminal themes" rather than application themes
   - Themes only define ANSI colors for terminal
   - Code editor has to manually map ANSI colors to semantic tokens
   - No unified theming strategy

3. **Scattered Definitions**: 
   - Theme names defined in `plugin-api/src/settings.ts`
   - Theme palettes defined in plugin implementations
   - No central registry

## Proposed Architecture

### 1. Central Theme Registry

**Location**: `packages/design-tokens/src/themes.ts`

Create a new module in the design-tokens package that serves as the single source of truth for all themes.

```typescript
// packages/design-tokens/src/themes.ts

export interface ThemeDefinition {
  id: string
  name: string
  
  // Terminal ANSI colors (for xterm.js)
  ansi: {
    background: string
    foreground: string
    cursor: string
    selectionBackground: string
    black: string
    brightBlack: string
    red: string
    brightRed: string
    green: string
    brightGreen: string
    yellow: string
    brightYellow: string
    blue: string
    brightBlue: string
    magenta: string
    brightMagenta: string
    cyan: string
    brightCyan: string
    white: string
    brightWhite: string
  }
  
  // Semantic tokens for code editor (CodeMirror)
  syntax: {
    keyword: string
    function: string
    variable: string
    type: string
    constant: string
    string: string
    number: string
    comment: string
    operator: string
    punctuation: string
    tag: string
    attribute: string
    property: string
    class: string
    interface: string
    namespace: string
    parameter: string
    decorator: string
    regexp: string
    escape: string
    link: string
    heading: string
    emphasis: string
    strong: string
    deleted: string
    inserted: string
    invalid: string
  }
}

export const THEMES: Record<string, ThemeDefinition> = {
  default: {
    id: 'default',
    name: 'Default',
    ansi: {
      background: '#0c0c0e',
      foreground: '#d6e1ff',
      cursor: '#ffcb6b',
      selectionBackground: 'rgba(122, 176, 255, 0.24)',
      black: '#2b3144',
      brightBlack: '#66708f',
      red: '#ff7b72',
      brightRed: '#ffa198',
      green: '#97e98b',
      brightGreen: '#bef5b8',
      yellow: '#ffd866',
      brightYellow: '#ffe38f',
      blue: '#7ab0ff',
      brightBlue: '#a4c8ff',
      magenta: '#d2a8ff',
      brightMagenta: '#e4c7ff',
      cyan: '#7ee7ff',
      brightCyan: '#b4f2ff',
      white: '#d6e1ff',
      brightWhite: '#ffffff'
    },
    syntax: {
      keyword: '#d2a8ff',        // magenta
      function: '#7ab0ff',        // blue
      variable: '#d6e1ff',        // foreground
      type: '#ffd866',            // yellow
      constant: '#7ee7ff',        // cyan
      string: '#97e98b',          // green
      number: '#ffd866',          // yellow
      comment: '#66708f',         // brightBlack
      operator: '#7ee7ff',        // cyan
      punctuation: '#d6e1ff',     // foreground
      tag: '#ff7b72',             // red
      attribute: '#7ab0ff',       // blue
      property: '#d6e1ff',        // foreground
      class: '#ffd866',           // yellow
      interface: '#ffd866',       // yellow
      namespace: '#ffd866',       // yellow
      parameter: '#d6e1ff',       // foreground
      decorator: '#d2a8ff',       // magenta
      regexp: '#7ee7ff',          // cyan
      escape: '#7ee7ff',          // cyan
      link: '#7ab0ff',            // blue
      heading: '#7ab0ff',         // blue
      emphasis: '#d6e1ff',        // foreground (italic)
      strong: '#d6e1ff',          // foreground (bold)
      deleted: '#ff7b72',         // red
      inserted: '#97e98b',        // green
      invalid: '#ff7b72'          // red
    }
  },
  
  dracula: {
    id: 'dracula',
    name: 'Dracula',
    ansi: {
      background: '#282a36',
      foreground: '#f8f8f2',
      cursor: '#f8f8f2',
      selectionBackground: 'rgba(68, 71, 90, 0.7)',
      black: '#21222c',
      brightBlack: '#6272a4',
      red: '#ff5555',
      brightRed: '#ff6e6e',
      green: '#50fa7b',
      brightGreen: '#69ff94',
      yellow: '#f1fa8c',
      brightYellow: '#ffffa5',
      blue: '#bd93f9',
      brightBlue: '#d6acff',
      magenta: '#ff79c6',
      brightMagenta: '#ff92df',
      cyan: '#8be9fd',
      brightCyan: '#a4ffff',
      white: '#f8f8f2',
      brightWhite: '#ffffff'
    },
    syntax: {
      keyword: '#ff79c6',
      function: '#bd93f9',
      variable: '#f8f8f2',
      type: '#f1fa8c',
      constant: '#8be9fd',
      string: '#50fa7b',
      number: '#f1fa8c',
      comment: '#6272a4',
      operator: '#8be9fd',
      punctuation: '#f8f8f2',
      tag: '#ff5555',
      attribute: '#bd93f9',
      property: '#f8f8f2',
      class: '#f1fa8c',
      interface: '#f1fa8c',
      namespace: '#f1fa8c',
      parameter: '#f8f8f2',
      decorator: '#ff79c6',
      regexp: '#8be9fd',
      escape: '#8be9fd',
      link: '#bd93f9',
      heading: '#bd93f9',
      emphasis: '#f8f8f2',
      strong: '#f8f8f2',
      deleted: '#ff5555',
      inserted: '#50fa7b',
      invalid: '#ff5555'
    }
  },
  
  'one-dark': {
    id: 'one-dark',
    name: 'One Dark',
    ansi: {
      background: '#282c34',
      foreground: '#abb2bf',
      cursor: '#528bff',
      selectionBackground: 'rgba(67, 74, 90, 0.7)',
      black: '#3f4451',
      brightBlack: '#4f5666',
      red: '#e06c75',
      brightRed: '#ff7b86',
      green: '#98c379',
      brightGreen: '#b1e18b',
      yellow: '#e5c07b',
      brightYellow: '#f0cc8e',
      blue: '#61afef',
      brightBlue: '#7ec4ff',
      magenta: '#c678dd',
      brightMagenta: '#de8ff0',
      cyan: '#56b6c2',
      brightCyan: '#6acfd6',
      white: '#abb2bf',
      brightWhite: '#c8cdd5'
    },
    syntax: {
      keyword: '#c678dd',
      function: '#61afef',
      variable: '#abb2bf',
      type: '#e5c07b',
      constant: '#56b6c2',
      string: '#98c379',
      number: '#e5c07b',
      comment: '#4f5666',
      operator: '#56b6c2',
      punctuation: '#abb2bf',
      tag: '#e06c75',
      attribute: '#61afef',
      property: '#abb2bf',
      class: '#e5c07b',
      interface: '#e5c07b',
      namespace: '#e5c07b',
      parameter: '#abb2bf',
      decorator: '#c678dd',
      regexp: '#56b6c2',
      escape: '#56b6c2',
      link: '#61afef',
      heading: '#61afef',
      emphasis: '#abb2bf',
      strong: '#abb2bf',
      deleted: '#e06c75',
      inserted: '#98c379',
      invalid: '#e06c75'
    }
  },
  
  'solarized-dark': {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    ansi: {
      background: '#002b36',
      foreground: '#839496',
      cursor: '#839496',
      selectionBackground: 'rgba(7, 54, 66, 0.8)',
      black: '#073642',
      brightBlack: '#002b36',
      red: '#dc322f',
      brightRed: '#cb4b16',
      green: '#859900',
      brightGreen: '#586e75',
      yellow: '#b58900',
      brightYellow: '#657b83',
      blue: '#268bd2',
      brightBlue: '#839496',
      magenta: '#d33682',
      brightMagenta: '#6c71c4',
      cyan: '#2aa198',
      brightCyan: '#93a1a1',
      white: '#eee8d5',
      brightWhite: '#fdf6e3'
    },
    syntax: {
      keyword: '#d33682',
      function: '#268bd2',
      variable: '#839496',
      type: '#b58900',
      constant: '#2aa198',
      string: '#859900',
      number: '#b58900',
      comment: '#586e75',
      operator: '#2aa198',
      punctuation: '#839496',
      tag: '#dc322f',
      attribute: '#268bd2',
      property: '#839496',
      class: '#b58900',
      interface: '#b58900',
      namespace: '#b58900',
      parameter: '#839496',
      decorator: '#d33682',
      regexp: '#2aa198',
      escape: '#2aa198',
      link: '#268bd2',
      heading: '#268bd2',
      emphasis: '#839496',
      strong: '#839496',
      deleted: '#dc322f',
      inserted: '#859900',
      invalid: '#dc322f'
    }
  },
  
  'github-dark': {
    id: 'github-dark',
    name: 'GitHub Dark',
    ansi: {
      background: '#0d1117',
      foreground: '#e6edf3',
      cursor: '#e6edf3',
      selectionBackground: 'rgba(33, 52, 71, 0.7)',
      black: '#484f58',
      brightBlack: '#6e7681',
      red: '#ff7b72',
      brightRed: '#ffa198',
      green: '#3fb950',
      brightGreen: '#56d364',
      yellow: '#d29922',
      brightYellow: '#e3b341',
      blue: '#58a6ff',
      brightBlue: '#79c0ff',
      magenta: '#bc8cff',
      brightMagenta: '#d2a8ff',
      cyan: '#39c5cf',
      brightCyan: '#56d4dd',
      white: '#b1bac4',
      brightWhite: '#e6edf3'
    },
    syntax: {
      keyword: '#bc8cff',
      function: '#58a6ff',
      variable: '#e6edf3',
      type: '#d29922',
      constant: '#39c5cf',
      string: '#3fb950',
      number: '#d29922',
      comment: '#6e7681',
      operator: '#39c5cf',
      punctuation: '#e6edf3',
      tag: '#ff7b72',
      attribute: '#58a6ff',
      property: '#e6edf3',
      class: '#d29922',
      interface: '#d29922',
      namespace: '#d29922',
      parameter: '#e6edf3',
      decorator: '#bc8cff',
      regexp: '#39c5cf',
      escape: '#39c5cf',
      link: '#58a6ff',
      heading: '#58a6ff',
      emphasis: '#e6edf3',
      strong: '#e6edf3',
      deleted: '#ff7b72',
      inserted: '#3fb950',
      invalid: '#ff7b72'
    }
  }
}

export type ThemeName = keyof typeof THEMES

// Helper to get theme by name with fallback
export function getTheme(name: string): ThemeDefinition {
  return THEMES[name] || THEMES.default
}

// Helper to get all theme names
export function getThemeNames(): ThemeName[] {
  return Object.keys(THEMES) as ThemeName[]
}
```

### 2. Update Plugin API

**File**: `packages/plugin-api/src/settings.ts`

```typescript
// Remove the hardcoded type, import from design-tokens instead
import type { ThemeName } from '@sessionry/design-tokens/themes'

export type AppTheme = 'system' | 'dark' | 'light'

// Rename to reflect it's an app theme, not just terminal
export type ThemeName = ThemeName // re-export

export interface AppSettings {
  version: 1
  theme: AppTheme
  colorTheme: ThemeName  // Renamed from terminalTheme
  terminalBgOverride: boolean
  terminalBgColor: string
  statusBarVisible: boolean
  confirmations: {
    confirmPaneClose: boolean
    confirmPaneGroupClose: boolean
    confirmSessionClose: boolean
  }
  plugins: Record<string, unknown>
}
```

### 3. Update Terminal Plugin

**File**: `plugins/plugin-default-view-terminal/src/TerminalPaneView.tsx`

```typescript
import { getTheme } from '@sessionry/design-tokens/themes'
import type { ThemeName } from '@sessionry/design-tokens/themes'

// Remove TERMINAL_THEMES constant - use central registry instead

const getTerminalTheme = (element: HTMLElement): ITheme => {
  const themeName = document.documentElement.getAttribute('data-theme') as ThemeName | null
  
  if (themeName && themeName !== 'default') {
    const theme = getTheme(themeName)
    return { ...theme.ansi }
  }
  
  // For default theme, read from CSS variables (existing logic)
  const styles = getComputedStyle(element)
  const theme = Object.fromEntries(
    Object.entries(terminalThemeVariables).map(([key, variable]) => {
      const value = styles.getPropertyValue(variable).trim()
      return [key, value || getTheme('default').ansi[key]]
    })
  ) as ITheme
  
  // Apply background override if set
  const bgOverride = getComputedStyle(document.documentElement)
    .getPropertyValue('--terminal-surface-bg').trim()
  if (bgOverride) {
    return { ...theme, background: bgOverride }
  }
  
  return theme
}
```

### 4. Update Code Editor Plugin

**File**: `plugins/plugin-default-view-code/src/renderer.tsx`

```typescript
import { getTheme } from '@sessionry/design-tokens/themes'
import type { ThemeName } from '@sessionry/design-tokens/themes'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// Remove TERMINAL_THEMES constant - use central registry instead

/**
 * Creates syntax highlighting theme using the theme's semantic token colors.
 * No more manual mapping from ANSI colors - themes define semantic tokens directly.
 */
const getSyntaxHighlighting = (element: HTMLElement): Extension => {
  const themeName = document.documentElement.getAttribute('data-theme') as ThemeName | null
  const theme = getTheme(themeName || 'default')
  const { syntax } = theme
  
  return syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.keyword, color: syntax.keyword },
      { tag: [t.function(t.variableName), t.labelName], color: syntax.function },
      { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: syntax.variable },
      { tag: [t.typeName, t.className, t.namespace], color: syntax.type },
      { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: syntax.constant },
      { tag: [t.processingInstruction, t.string, t.inserted], color: syntax.string },
      { tag: [t.number, t.changed, t.annotation, t.modifier, t.self], color: syntax.number },
      { tag: [t.meta, t.comment], color: syntax.comment, fontStyle: 'italic' },
      { tag: [t.operator, t.operatorKeyword], color: syntax.operator },
      { tag: [t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: syntax.escape },
      { tag: t.link, color: syntax.link, textDecoration: 'underline' },
      { tag: t.heading, fontWeight: 'bold', color: syntax.heading },
      { tag: [t.atom, t.bool, t.special(t.variableName)], color: syntax.constant },
      { tag: t.strong, fontWeight: 'bold', color: syntax.strong },
      { tag: t.emphasis, fontStyle: 'italic', color: syntax.emphasis },
      { tag: t.strikethrough, textDecoration: 'line-through' },
      { tag: t.invalid, color: syntax.invalid }
    ])
  )
}

/**
 * Creates editor theme using theme's ANSI colors for UI elements.
 */
const getEditorTheme = (element: HTMLElement): Extension => {
  const themeName = document.documentElement.getAttribute('data-theme') as ThemeName | null
  const theme = getTheme(themeName || 'default')
  const { ansi } = theme
  
  let backgroundColor = ansi.background
  let foregroundColor = ansi.foreground
  let cursorColor = ansi.cursor
  let selectionColor = ansi.selectionBackground
  
  // Check for background override
  const bgOverride = getComputedStyle(document.documentElement)
    .getPropertyValue('--terminal-surface-bg').trim()
  if (bgOverride) {
    backgroundColor = bgOverride
  }
  
  return EditorView.theme({
    '&': {
      backgroundColor,
      color: foregroundColor
    },
    '.cm-content': {
      caretColor: cursorColor
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: cursorColor
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: selectionColor
    },
    '.cm-activeLine': {
      backgroundColor: `${ansi.brightBlack}40` // Add alpha
    },
    '.cm-gutters': {
      backgroundColor: `${ansi.black}80`,
      borderRight: `1px solid ${ansi.brightBlack}`
    },
    '.cm-activeLineGutter': {
      backgroundColor: `${ansi.brightBlack}40`
    }
  }, { dark: true })
}
```

### 5. Update Design Tokens Package

**File**: `packages/design-tokens/src/index.ts`

```typescript
// Add export for themes
export * from './themes'

// Existing exports...
export const theme = './theme.css'
export const tokens = './tokens.css'
// ...
```

**File**: `packages/design-tokens/package.json`

```json
{
  "name": "@sessionry/design-tokens",
  "exports": {
    ".": "./src/index.ts",
    "./theme.css": "./src/theme.css",
    "./tokens.css": "./src/tokens.css",
    "./themes": "./src/themes.ts"  // Add explicit export
  }
}
```

## Benefits

1. **Single Source of Truth**: All themes defined in one place
2. **Semantic Token Support**: Themes explicitly define colors for code syntax, not just ANSI
3. **Better Naming**: "Theme" instead of "Terminal Theme" - reflects broader usage
4. **Type Safety**: TypeScript types ensure correct theme structure
5. **Extensibility**: Easy to add new themes or extend theme properties
6. **Consistency**: Terminal and code editor guaranteed to use same color palette
7. **Maintainability**: Changes to themes only need to happen in one file

## Migration Strategy

### Phase 1: Create Central Registry
1. Create `packages/design-tokens/src/themes.ts` with all theme definitions
2. Add exports to `packages/design-tokens/src/index.ts`
3. Update package.json exports

### Phase 2: Update Plugin API
1. Import `ThemeName` from design-tokens
2. Rename `terminalTheme` to `colorTheme` in settings
3. Update attribute name from `data-terminal-theme` to `data-theme`

### Phase 3: Update Terminal Plugin
1. Remove local `TERMINAL_THEMES` constant
2. Import `getTheme` from design-tokens
3. Update `getTerminalTheme()` to use central registry
4. Update attribute listener from `data-terminal-theme` to `data-theme`

### Phase 4: Update Code Editor Plugin
1. Remove local `TERMINAL_THEMES` constant
2. Import `getTheme` from design-tokens
3. Update `getSyntaxHighlighting()` to use `theme.syntax` directly
4. Update `getEditorTheme()` to use `theme.ansi`
5. Update attribute listener from `data-terminal-theme` to `data-theme`

### Phase 5: Update Settings UI
1. Update settings plugin to use new `colorTheme` setting name
2. Update UI labels from "Terminal Theme" to "Color Theme"
3. Update theme preview to show both terminal and code editor

## Future Enhancements

1. **Light Theme Support**: Add light variants of themes
2. **Custom Themes**: Allow users to create and import custom themes
3. **Theme Editor**: UI for creating/editing themes
4. **Theme Marketplace**: Share themes with community
5. **Per-Language Syntax**: Override syntax colors per language
6. **Semantic UI Tokens**: Extend themes to include UI element colors beyond terminal/editor

## Example: Adding a New Theme

```typescript
// In packages/design-tokens/src/themes.ts

export const THEMES: Record<string, ThemeDefinition> = {
  // ... existing themes ...
  
  'monokai': {
    id: 'monokai',
    name: 'Monokai',
    ansi: {
      background: '#272822',
      foreground: '#f8f8f2',
      cursor: '#f8f8f0',
      selectionBackground: 'rgba(73, 72, 62, 0.7)',
      black: '#272822',
      brightBlack: '#75715e',
      red: '#f92672',
      brightRed: '#f92672',
      green: '#a6e22e',
      brightGreen: '#a6e22e',
      yellow: '#f4bf75',
      brightYellow: '#f4bf75',
      blue: '#66d9ef',
      brightBlue: '#66d9ef',
      magenta: '#ae81ff',
      brightMagenta: '#ae81ff',
      cyan: '#a1efe4',
      brightCyan: '#a1efe4',
      white: '#f8f8f2',
      brightWhite: '#f9f8f5'
    },
    syntax: {
      keyword: '#f92672',
      function: '#a6e22e',
      variable: '#f8f8f2',
      type: '#66d9ef',
      constant: '#ae81ff',
      string: '#e6db74',
      number: '#ae81ff',
      comment: '#75715e',
      operator: '#f92672',
      punctuation: '#f8f8f2',
      tag: '#f92672',
      attribute: '#a6e22e',
      property: '#f8f8f2',
      class: '#66d9ef',
      interface: '#66d9ef',
      namespace: '#66d9ef',
      parameter: '#fd971f',
      decorator: '#f92672',
      regexp: '#e6db74',
      escape: '#ae81ff',
      link: '#66d9ef',
      heading: '#a6e22e',
      emphasis: '#f8f8f2',
      strong: '#f8f8f2',
      deleted: '#f92672',
      inserted: '#a6e22e',
      invalid: '#f92672'
    }
  }
}
```

That's it! The new theme is immediately available to both terminal and code editor.
