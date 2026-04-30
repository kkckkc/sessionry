# Component Library & Storybook Implementation Plan

## Overview

This plan outlines the creation of a reusable component library with Storybook documentation, extracting components from the existing app while establishing a scalable architecture that supports future theming capabilities.

## Architecture Decision: Design Tokens Strategy

### Recommended Approach: Separate `@sessionry/design-tokens` Package

**Rationale:**
1. **Storybook Integration**: Easy to import tokens without app dependencies
2. **Future Theming**: Enables theme plugins to override tokens at runtime
3. **Separation of Concerns**: Clear boundary between design system and implementation
4. **Reusability**: Plugins can import tokens without depending on components
5. **Versioning**: Independent versioning of design system updates

**Package Structure:**
```
packages/
├── design-tokens/          # NEW: Design system tokens
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts        # Export all tokens
│       ├── tokens.css      # CSS custom properties
│       ├── colors.ts       # Color palette (optional JS export)
│       └── spacing.ts      # Spacing scale (optional JS export)
├── components/             # NEW: Component library
│   ├── package.json
│   ├── tsconfig.json
│   ├── .storybook/
│   └── src/
│       ├── index.ts
│       ├── Button/
│       ├── Toggle/
│       ├── Input/
│       └── ...
└── app/                    # EXISTING: Main application
    └── ...
```

## Current Component Inventory

### Existing Components to Extract

#### Form Controls (High Priority)
- **SettingsSection** - Section container with title/description
- **SettingToggle** - Toggle switch with label
- **SettingInput** - Text/number input field
- **SettingSelect** - Dropdown select

#### UI Components (Medium Priority)
- **Button** - Primary action button with variants
- **Toolbar** - Application toolbar container
- **Menu** - Context/dropdown menu
- **Dialog** - Modal dialog
- **Tabs** - Tab navigation
- **Pane** - Content pane container

#### Layout Components (Lower Priority)
- **Sidebar** - Navigation sidebar
- **StatusBar** - Bottom status bar

### Existing CSS to Extract

#### Core Styles
- `tokens.css` - Design tokens (colors, spacing, etc.)
- `context.css` - Context-based theming system
- `base.css` - Reset and base styles

#### Component Styles
- `button.css` - Button variants and states
- `settings.css` - Form control styles
- `toolbar.css` - Toolbar layout
- `menu.css` - Menu styling
- `dialog.css` - Modal dialog
- `tabs.css` - Tab navigation
- `pane.css` - Pane containers

## Implementation Phases

### Phase 1: Foundation Setup

#### 1.1 Create `@sessionry/design-tokens` Package
```json
{
  "name": "@sessionry/design-tokens",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./tokens.css": "./src/tokens.css"
  }
}
```

**Contents:**
- Extract `tokens.css` from app
- Extract `context.css` for context-based theming
- Create TypeScript exports for programmatic access (optional)
- Add build configuration (if needed for TS exports)

#### 1.2 Create `@sessionry/components` Package
```json
{
  "name": "@sessionry/components",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "dependencies": {
    "@sessionry/design-tokens": "workspace:*"
  }
}
```

**Build Setup:**
- Vite for bundling (matches existing app setup)
- TypeScript for type definitions
- CSS modules or plain CSS (maintain existing approach)

#### 1.3 Set Up Storybook
```bash
# In packages/components
npx storybook@latest init --type react-vite
```

**Storybook Configuration:**
- Import design tokens in `.storybook/preview.ts`
- Configure dark theme (matches app aesthetic)
- Set up viewport presets
- Add accessibility addon

### Phase 2: Component Extraction

#### 2.1 Form Controls (Week 1)

**Priority Order:**
1. **Button** - Most fundamental, used everywhere
2. **SettingToggle** - Self-contained, clear API
3. **SettingInput** - Simple text/number input
4. **SettingSelect** - Dropdown with options
5. **SettingsSection** - Container component

**Extraction Strategy:**
```typescript
// packages/components/src/Button/Button.tsx
import './Button.css'

export interface ButtonProps {
  variant?: 'default' | 'ghost' | 'primary'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  tooltip?: string
  onClick?: () => void
  children: React.ReactNode
}

export const Button = ({ 
  variant = 'default',
  size = 'md',
  ...props 
}: ButtonProps) => {
  // Implementation
}
```

**CSS Strategy:**
- Keep component-specific styles with component
- Import design tokens via `@sessionry/design-tokens/tokens.css`
- Maintain context-based theming (`--ctx-*` variables)

#### 2.2 Layout Components (Week 2)

**Components:**
- Toolbar
- Menu
- Dialog
- Tabs
- Pane

**Considerations:**
- Some components may need app-specific logic (e.g., Toolbar with window controls)
- Create base components, allow app to extend/compose
- Document composition patterns

### Phase 3: Integration & Migration

#### 3.1 Update App Dependencies
```json
// packages/app/package.json
{
  "dependencies": {
    "@sessionry/design-tokens": "workspace:*",
    "@sessionry/components": "workspace:*"
  }
}
```

#### 3.2 Migration Strategy

**Incremental Approach:**
1. Keep old components alongside new ones initially
2. Update one feature area at a time (e.g., Settings UI first)
3. Test thoroughly before removing old code
4. Update imports progressively

**Example Migration:**
```typescript
// Before
import { SettingToggle } from '../components/SettingsFormControls'

// After
import { Toggle } from '@sessionry/components'
```

#### 3.3 Plugin Integration

**Update Plugin API:**
```typescript
// packages/plugin-api/src/components.ts
export * from '@sessionry/components'
```

**Benefits:**
- Plugins get consistent UI components
- Automatic updates when components improve
- Shared design language across plugins

### Phase 4: Documentation & Testing

#### 4.1 Storybook Stories

**Story Structure:**
```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'ghost', 'primary']
    }
  }
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {
  args: {
    children: 'Click me'
  }
}

export const WithTooltip: Story = {
  args: {
    children: 'Hover me',
    tooltip: 'This is a tooltip'
  }
}
```

#### 4.2 Component Testing

**Test Strategy:**
- Unit tests for component logic (Vitest)
- Visual regression tests (Storybook + Chromatic)
- Accessibility tests (jest-axe)
- Integration tests in app context

#### 4.3 Documentation

**Component Documentation:**
- Props API documentation (auto-generated from TypeScript)
- Usage examples in stories
- Composition patterns
- Accessibility guidelines
- Migration guide for existing code

### Phase 5: Future Theming System

#### 5.1 Theme Plugin Architecture

**Design Goals:**
1. Plugins can register custom themes
2. Themes override design tokens
3. Runtime theme switching
4. Persist user theme preference

**Proposed API:**
```typescript
// Future plugin API
export interface ThemePlugin {
  id: string
  name: string
  tokens: {
    colors?: Partial<ColorTokens>
    spacing?: Partial<SpacingTokens>
    // ...
  }
}

// App registers theme
pluginManager.registerTheme({
  id: 'nord',
  name: 'Nord Theme',
  tokens: {
    colors: {
      accent: '#88c0d0',
      // ...
    }
  }
})
```

**Implementation Strategy:**
1. Design tokens package exports token structure
2. App provides theme injection mechanism
3. Plugins provide token overrides
4. CSS custom properties updated at runtime

## Technical Considerations

### CSS Architecture

**Current System:**
- CSS custom properties for theming
- Context-based tokens (`--ctx-*`)
- Component-scoped styles

**Maintain:**
- Keep context system (enables nested theming)
- Use CSS custom properties (runtime flexibility)
- Scope component styles to avoid conflicts

**Enhance:**
- Document token usage patterns
- Create token categories (semantic vs. raw)
- Establish naming conventions

### Build & Bundling

**Design Tokens:**
- No build step needed (pure CSS)
- Optional: Generate TypeScript types from CSS

**Components:**
- Vite for bundling
- Generate ES modules + types
- Tree-shakeable exports
- CSS bundled with components

**Storybook:**
- Separate build from component library
- Use for development and documentation
- Deploy to static hosting (optional)

### TypeScript Configuration

**Shared Config:**
```json
// tsconfig.base.json (already exists)
{
  "compilerOptions": {
    "paths": {
      "@sessionry/design-tokens": ["./packages/design-tokens/src"],
      "@sessionry/components": ["./packages/components/src"]
    }
  }
}
```

## Success Criteria

### Phase 1 Complete When:
- [ ] `@sessionry/design-tokens` package created and building
- [ ] `@sessionry/components` package created and building
- [ ] Storybook running and displaying example story
- [ ] Design tokens imported and working in Storybook

### Phase 2 Complete When:
- [ ] All form control components extracted and working
- [ ] All layout components extracted and working
- [ ] Each component has basic Storybook story
- [ ] Component styles properly scoped and themed

### Phase 3 Complete When:
- [ ] App successfully imports from new packages
- [ ] At least one feature area migrated (e.g., Settings)
- [ ] Plugins can import components via plugin-api
- [ ] No regressions in app functionality

### Phase 4 Complete When:
- [ ] All components have comprehensive stories
- [ ] Component documentation complete
- [ ] Tests passing for all components
- [ ] Migration guide written

### Phase 5 Complete When:
- [ ] Theme plugin API designed and documented
- [ ] Example theme plugin created
- [ ] Runtime theme switching working
- [ ] Theme persistence implemented

## Risks & Mitigations

### Risk: Breaking Changes During Migration
**Mitigation:** 
- Keep old and new components side-by-side
- Migrate incrementally, one feature at a time
- Comprehensive testing before removing old code

### Risk: CSS Conflicts
**Mitigation:**
- Use consistent naming conventions
- Scope component styles
- Test in isolation (Storybook) and integration (app)

### Risk: Build Complexity
**Mitigation:**
- Use familiar tools (Vite, matches app)
- Keep build configs simple
- Document build process

### Risk: Plugin Compatibility
**Mitigation:**
- Version components package carefully
- Provide migration guides for breaking changes
- Test with existing plugins

## Timeline Estimate

- **Phase 1 (Foundation):** 2-3 days
- **Phase 2 (Extraction):** 1-2 weeks
- **Phase 3 (Integration):** 3-5 days
- **Phase 4 (Documentation):** 3-5 days
- **Phase 5 (Theming):** 1-2 weeks (future work)

**Total Initial Implementation:** 3-4 weeks

## Next Steps

1. Review and approve this plan
2. Create `@sessionry/design-tokens` package structure
3. Create `@sessionry/components` package structure
4. Set up Storybook
5. Begin component extraction with Button component

## Questions for Discussion

1. **Component Naming:** Keep existing names (e.g., `SettingToggle`) or rename for library (e.g., `Toggle`)?
2. **CSS Approach:** Continue with plain CSS or consider CSS modules/styled-components?
3. **Storybook Deployment:** Should we deploy Storybook publicly or keep it local?
4. **Testing Priority:** Which components need the most thorough testing?
5. **Plugin API:** Should components be re-exported through plugin-api or direct dependency?

## References

- Current app structure: `/packages/app/`
- Existing components: `/packages/app/src/renderer/src/components/`
- Existing styles: `/packages/app/src/renderer/src/styles/`
- Plugin API: `/packages/plugin-api/`
