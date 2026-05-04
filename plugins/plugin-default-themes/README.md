# Default Themes Plugin

This plugin provides the default color themes for Sessionry.

## Themes Included

- **Default** - The default Sessionry theme with vibrant colors
- **Dracula** - A dark theme for those who live in the night
- **One Dark** - Atom's iconic One Dark theme
- **Solarized Dark** - Precision colors for machines and people
- **GitHub Dark** - GitHub's dark theme

## Theme Structure

Each theme defines:

- **ANSI Colors**: 16 terminal colors (black, red, green, yellow, blue, magenta, cyan, white + bright variants)
- **Semantic Syntax Tokens**: Colors for code editor syntax highlighting (keywords, functions, strings, etc.)

## Adding New Themes

To add a new theme to this plugin:

1. Create a new file in `src/themes/` (e.g., `my-theme.ts`)
2. Define your theme using the `ThemeDefinition` interface
3. Export it from `src/index.ts`

Example:

```typescript
import type { ThemeDefinition } from '@sessionry/plugin-api'

export const myTheme: ThemeDefinition = {
  id: 'my-theme',
  name: 'My Theme',
  description: 'A custom theme',
  author: 'Your Name',
  ansi: {
    background: '#000000',
    foreground: '#ffffff',
    // ... other ANSI colors
  },
  syntax: {
    keyword: '#ff0000',
    function: '#00ff00',
    // ... other syntax colors
  }
}
```

## Creating a Custom Theme Plugin

You can create your own theme plugin by following this structure:

```typescript
import type { AppPlugin, ThemeDefinition } from '@sessionry/plugin-api'

const myCustomTheme: ThemeDefinition = {
  // ... theme definition
}

export const myThemePlugin: AppPlugin = {
  id: 'my-custom-themes',
  name: 'My Custom Themes',
  themes: [myCustomTheme]
}

export default myThemePlugin
```

Place your plugin in the `plugins/` directory and it will be automatically loaded by Sessionry.
