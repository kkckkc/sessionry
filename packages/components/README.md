# @sessionry/components

React component library for Sessionry.

## Installation

```bash
pnpm add @sessionry/components
```

## Usage

```typescript
import { Button } from '@sessionry/components'
import '@sessionry/components/style.css'

function App() {
  return <Button onClick={() => console.log('clicked')}>Click me</Button>
}
```

## Development

### Install dependencies

```bash
pnpm install
```

### Run Storybook

```bash
pnpm storybook
```

### Build library

```bash
pnpm build
```

### Run tests

```bash
pnpm test
```

### Type checking

```bash
pnpm typecheck
```

## Components

Components will be documented here as they are created.

### Planned Components

- **Button** - Primary action button with variants
- **Toggle** - Toggle switch for boolean settings
- **Input** - Text and number input fields
- **Select** - Dropdown select component
- **Section** - Settings section container
- **Toolbar** - Application toolbar
- **Menu** - Context and dropdown menus
- **Dialog** - Modal dialogs
- **Tabs** - Tab navigation
- **Pane** - Content pane containers

## Design Tokens

This library uses `@sessionry/design-tokens` for consistent theming. The design tokens are automatically imported in Storybook.

## Contributing

See the main repository README for contribution guidelines.

## License

MIT
