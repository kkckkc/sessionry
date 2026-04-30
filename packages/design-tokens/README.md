# @sessionry/design-tokens

Design tokens and CSS variables for the Sessionry design system.

## Installation

```bash
pnpm add @sessionry/design-tokens
```

## Usage

### In CSS/SCSS

Import the token files in your stylesheets:

```css
@import '@sessionry/design-tokens/tokens.css';
@import '@sessionry/design-tokens/context.css';
@import '@sessionry/design-tokens/base.css';
```

### In JavaScript/TypeScript

```typescript
import '@sessionry/design-tokens/tokens.css'
import '@sessionry/design-tokens/context.css'
import '@sessionry/design-tokens/base.css'
```

### In Storybook

Add to `.storybook/preview.ts`:

```typescript
import '@sessionry/design-tokens/tokens.css'
import '@sessionry/design-tokens/context.css'
import '@sessionry/design-tokens/base.css'

export const preview = {
  // ... your config
}
```

## Available Tokens

### Color Tokens

```css
--window-bg: #1a1a1c;
--chrome-bg: #242426;
--sidebar-bg: #1e1e20;
--workspace-bg: #0c0c0e;
--workspace-bg2: #181818;

--panel-bg: #1c1c1e;
--panel-bg-soft: #202124;
--panel-bg-strong: #111214;

--border-color: rgba(255, 255, 255, 0.07);
--border-subtle: rgba(255, 255, 255, 0.05);

--text-primary: rgba(255, 255, 255, 0.85);
--text-secondary: rgba(255, 255, 255, 0.4);
--text-tertiary: rgba(255, 255, 255, 0.25);

--accent: #3b82f6;
--accent-bg: rgba(59, 130, 246, 0.18);
--accent-border: rgba(59, 130, 246, 0.3);

--button-bg: transparent;
--button-bg-hover: rgba(255, 255, 255, 0.05);

--shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
```

### Context Tokens

Context tokens allow components to adapt to their container context (chrome, workspace, etc.):

```css
--ctx-bg: var(--chrome-bg);
--ctx-btn-bg: var(--button-bg);
--ctx-btn-hover: var(--button-bg-hover);
--ctx-tab-bg: var(--workspace-bg);
--ctx-tab-hover-bg: var(--workspace-bg2);
--ctx-border: var(--border-color);
```

## Context-Based Theming

Components can use context tokens to adapt to their environment:

```css
.my-component {
  background: var(--ctx-bg);
  border: 1px solid var(--ctx-border);
}
```

Apply context classes to containers:

```html
<div class="ctx-chrome">
  <!-- Components here use chrome context -->
</div>

<div class="ctx-workspace">
  <!-- Components here use workspace context -->
</div>
```

## Future: Theme Plugins

This package is designed to support future theme plugins. Plugins will be able to override token values at runtime:

```typescript
// Future API (not yet implemented)
pluginManager.registerTheme({
  id: 'my-theme',
  name: 'My Custom Theme',
  tokens: {
    accent: '#ff6b6b',
    // ... other overrides
  }
})
```

## License

MIT
