# @sessionry/design-tokens

Design tokens and CSS variables for the Sessionry design system.

## Installation

```bash
pnpm add @sessionry/design-tokens
```

## Usage

### Preferred entrypoint

Import the canonical theme entrypoint in app, Storybook, or plugin CSS:

```css
@import '@sessionry/design-tokens/theme.css';
```

```typescript
import '@sessionry/design-tokens/theme.css'
```

### Advanced usage

The individual files are still exported when you need explicit control over load order:

```css
@import '@sessionry/design-tokens/tokens.css';
@import '@sessionry/design-tokens/base.css';
@import '@sessionry/design-tokens/context.css';
```

## Supported Token Contract

These CSS custom properties are the supported public token surface for consumers.

### Semantic color and surface tokens

```css
--bg
--surface
--surface-high
--term-bg

--text
--text-muted
--text-dim

--accent
--accent-bg

--success
--success-bg
--warning
--warning-bg
--danger
--danger-bg

--border
--border-strong
--border-subtle
--border-active

--input-bg
--border-input

--hover
```

### Structural/contextual surface tokens

These are still supported and intentionally retained because the app uses them to distinguish specific host surfaces:

```css
--window-bg
--chrome-bg
--sidebar-bg
--workspace-bg
--workspace-bg2
--canvas-bg
--panel-bg
--panel-bg-soft
--panel-bg-strong
```

### Shadow tokens

```css
--shadow-sm
--shadow-md
--shadow-lg
--shadow-xl
--shadow
```

### Typography tokens

```css
--display-font-size
--display-font-weight
--heading-font-size
--heading-font-weight
--title-font-size
--title-font-weight
--body-lg-font-size
--body-lg-font-weight
--body-font-size
--body-font-weight
--body-sm-font-size
--body-sm-font-weight
--caption-font-size
--caption-font-weight
--overline-font-size
--overline-font-weight
```

### Spacing tokens

```css
--space-1
--space-2
--space-3
--space-4
--space-5
--space-6
--space-7
--space-8
--space-9
```

### Radius tokens

```css
--radius-1
--radius-2
--radius-3
--radius-4
--radius-5
--radius-6
--radius-7
--radius-8
```

### Context tokens

Context tokens allow components to adapt to their container context:

```css
--ctx-bg
--ctx-btn-bg
--ctx-btn-hover
--ctx-tab-bg
--ctx-tab-hover-bg
--ctx-border
```

## Invalid token names

These names are not part of the supported contract and should not be used:

```css
--color-surface-primary
--color-text-primary
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
    accent: '#ff6b6b'
  }
})
```

## License

MIT
