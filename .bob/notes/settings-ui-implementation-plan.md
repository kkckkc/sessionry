# Settings UI Implementation Plan

## Overview

Build a comprehensive settings UI system that allows plugins to contribute settings views, with a core mechanism to display and manage all settings. The implementation will follow VS Code's pattern of opening settings in the main workspace area.

## Architecture Analysis

### Current State

1. **Settings Storage**
   - `SettingsStore` class manages settings persistence (YAML file)
   - `AppSettings` interface: `{ version: 1, statusBarVisible: boolean, plugins: Record<string, unknown> }`
   - Settings are loaded at startup and can be updated via IPC
   - Changes emit events to renderer via `settings:changed` channel

2. **Plugin System**
   - Plugins contribute views via `PluginViewDefinition` with slots
   - Existing slots: `sidebar:left`, `sidebar:right`, `workspace`, `pane:terminal`
   - Views are resolved and rendered dynamically
   - Plugins can contribute actions, status items, and views

3. **Terminal Plugin Settings**
   - `TmuxSettings` interface already defined with 5 boolean options
   - Settings stored under `plugins['plugin-default-view-terminal'].tmux`
   - No UI currently exists to edit these settings

### Design Decisions

1. **Settings View Slot**: Create a new slot type `settings` for plugin settings contributions
2. **Settings Container**: Core settings view acts as a router/container showing plugin settings
3. **Settings View Props**: New interface for settings-specific view props (includes settings API)
4. **Navigation**: Settings view shows a list of available plugin settings with navigation
5. **Form Components**: Reusable form controls for common setting types (boolean, string, number, enum)

## Implementation Steps

### 1. Design the Plugin Settings Contribution API

**Files to modify:**
- `packages/plugin-api/src/plugins.ts`
- `packages/plugin-api/src/settings.ts`

**Changes:**

#### Add Settings View Props Interface
```typescript
// packages/plugin-api/src/plugins.ts

export interface SettingsViewProps {
  pluginId: string
  settings: unknown // Plugin-specific settings object
  onUpdate: (updates: unknown) => Promise<void>
}
```

#### Add Settings View Definition
```typescript
// packages/plugin-api/src/plugins.ts

export interface PluginSettingsViewDefinition {
  id: string
  title: string
  description?: string
  icon?: string
}

export interface AppPlugin {
  // ... existing properties
  settingsView?: PluginSettingsViewDefinition
}
```

#### Add Settings API to Context
```typescript
// packages/plugin-api/src/plugins.ts

export interface RendererPluginContext {
  workspace: WorkspaceApi
  settings: {
    read: () => AppSettings
    update: (updates: Partial<AppSettings>) => Promise<void>
    onChange: (listener: (settings: AppSettings) => void) => () => void
  }
}
```

### 2. Create Core Settings View Infrastructure

**New files to create:**
- `packages/app/src/renderer/src/components/SettingsView.tsx`
- `packages/app/src/renderer/src/components/SettingsNav.tsx`
- `packages/app/src/renderer/src/styles/components/settings.css`

**SettingsView.tsx Structure:**
```typescript
interface SettingsViewProps extends WorkspaceViewProps {
  // Inherits plugins, workspace, resolveRendererView
}

export const SettingsView = ({ plugins, workspace, resolveRendererView }: SettingsViewProps) => {
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null)
  const [settings, setSettings] = useState<AppSettings>(() => /* read settings */)
  
  // Get all plugins that have settings views
  const pluginsWithSettings = plugins.actions
    .map(action => /* find plugin by action */)
    .filter(plugin => plugin.settingsView)
  
  const selectedPlugin = pluginsWithSettings.find(p => p.id === selectedPluginId)
  
  return (
    <div className="settings-view">
      <SettingsNav 
        plugins={pluginsWithSettings}
        selectedPluginId={selectedPluginId}
        onSelect={setSelectedPluginId}
      />
      <div className="settings-content">
        {selectedPlugin ? (
          <PluginSettingsView 
            plugin={selectedPlugin}
            settings={settings.plugins[selectedPlugin.id]}
            onUpdate={(updates) => /* update settings */}
          />
        ) : (
          <div className="settings-empty">Select a plugin to configure</div>
        )}
      </div>
    </div>
  )
}
```

**SettingsNav.tsx Structure:**
```typescript
interface SettingsNavProps {
  plugins: Array<{ id: string; name: string; settingsView: PluginSettingsViewDefinition }>
  selectedPluginId: string | null
  onSelect: (pluginId: string) => void
}

export const SettingsNav = ({ plugins, selectedPluginId, onSelect }: SettingsNavProps) => {
  return (
    <nav className="settings-nav">
      <h2>Settings</h2>
      <ul>
        {plugins.map(plugin => (
          <li key={plugin.id}>
            <button 
              className={selectedPluginId === plugin.id ? 'is-active' : ''}
              onClick={() => onSelect(plugin.id)}
            >
              {plugin.settingsView.icon && <Icon name={plugin.settingsView.icon} />}
              <span>{plugin.settingsView.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

### 3. Build Settings UI Components (Form Controls)

**New file:**
- `packages/app/src/renderer/src/components/SettingsFormControls.tsx`

**Components to create:**

```typescript
// Boolean toggle switch
export const SettingToggle = ({ 
  label, 
  description, 
  value, 
  onChange 
}: {
  label: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
}) => { /* ... */ }

// Text input
export const SettingInput = ({ 
  label, 
  description, 
  value, 
  onChange,
  type = 'text'
}: {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number'
}) => { /* ... */ }

// Select dropdown
export const SettingSelect = ({ 
  label, 
  description, 
  value, 
  options,
  onChange 
}: {
  label: string
  description?: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) => { /* ... */ }

// Settings section
export const SettingsSection = ({ 
  title, 
  description, 
  children 
}: {
  title: string
  description?: string
  children: React.ReactNode
}) => { /* ... */ }
```

### 4. Implement Terminal Plugin Settings View

**New file:**
- `plugins/plugin-default-view-terminal/src/SettingsView.tsx`

**Structure:**
```typescript
import type { SettingsViewProps } from '@sessionry/plugin-api'
import type { TerminalPluginSettings } from './settings'
import { SettingToggle, SettingsSection } from '@sessionry/app/components/SettingsFormControls'

export const TerminalSettingsView = ({ 
  settings, 
  onUpdate 
}: SettingsViewProps) => {
  const tmuxSettings = (settings as TerminalPluginSettings)?.tmux ?? {
    enabled: false,
    dedicatedSocket: true,
    disableStatusBar: false,
    inheritConfig: true,
    killOnExit: true
  }
  
  const updateTmuxSetting = (key: keyof TmuxSettings, value: boolean) => {
    onUpdate({
      tmux: { ...tmuxSettings, [key]: value }
    })
  }
  
  return (
    <div className="terminal-settings">
      <h1>Terminal Settings</h1>
      
      <SettingsSection 
        title="Tmux Integration"
        description="Configure how Sessionry integrates with tmux for session persistence"
      >
        <SettingToggle
          label="Enable tmux"
          description="Use tmux to keep sessions alive across restarts"
          value={tmuxSettings.enabled}
          onChange={(value) => updateTmuxSetting('enabled', value)}
        />
        
        <SettingToggle
          label="Dedicated socket"
          description="Use a dedicated tmux socket (-L sessionry) isolated from your own tmux sessions"
          value={tmuxSettings.dedicatedSocket}
          onChange={(value) => updateTmuxSetting('dedicatedSocket', value)}
        />
        
        <SettingToggle
          label="Disable status bar"
          description="Disable the tmux status bar inside Sessionry panes"
          value={tmuxSettings.disableStatusBar}
          onChange={(value) => updateTmuxSetting('disableStatusBar', value)}
        />
        
        <SettingToggle
          label="Inherit config"
          description="Inherit your ~/.tmux.conf. When disabled, tmux starts with no config (-f /dev/null)"
          value={tmuxSettings.inheritConfig}
          onChange={(value) => updateTmuxSetting('inheritConfig', value)}
        />
        
        <SettingToggle
          label="Kill on exit"
          description="Kill tmux sessions (and the dedicated server, if applicable) when Sessionry exits"
          value={tmuxSettings.killOnExit}
          onChange={(value) => updateTmuxSetting('killOnExit', value)}
        />
      </SettingsSection>
    </div>
  )
}
```

**Update plugin definition:**
```typescript
// plugins/plugin-default-view-terminal/src/index.ts

export const terminalPanePlugin: AppPlugin = {
  // ... existing properties
  settingsView: {
    id: 'settings.terminal',
    title: 'Terminal',
    description: 'Configure terminal and tmux settings',
    icon: 'TbTerminal'
  }
}
```

**Update renderer plugin:**
```typescript
// plugins/plugin-default-view-terminal/src/renderer.tsx

import { TerminalSettingsView } from './SettingsView'

export const terminalPaneRendererPlugin: RendererAppPlugin = {
  // ... existing properties
  settingsView: {
    id: 'settings.terminal',
    title: 'Terminal',
    description: 'Configure terminal and tmux settings',
    icon: 'TbTerminal',
    component: TerminalSettingsView
  }
}
```

### 5. Add "Open Settings" Action

**File to modify:**
- `packages/app/src/main/plugins.ts` or create a core plugin

**Action definition:**
```typescript
{
  id: 'app:open-settings',
  name: 'Open Settings',
  icon: 'TbSettings',
  description: 'Open application settings',
  category: 'Application',
  defaultKeybinding: 'C-,',
  surfaces: ['toolbar', 'palette'],
  run: async (context) => {
    // Switch active view to settings
    const activeProject = context.workspace.getProject(context.activeProjectId!)
    if (!activeProject) return { status: 'completed' }
    
    await activeProject.update({
      activeViews: {
        ...activeProject.data.activeViews,
        workspace: 'view.settings'
      }
    })
    
    return { status: 'completed' }
  }
}
```

**Register settings view:**
```typescript
// In a core plugin or built-in plugin
{
  views: [
    {
      id: 'view.settings',
      title: 'Settings',
      slot: 'workspace'
    }
  ]
}
```

### 6. Wire Up Settings Persistence and Reactivity

**Files to modify:**
- `packages/app/src/renderer/src/App.tsx`
- `packages/app/src/preload/index.ts`

**Add settings context to renderer:**
```typescript
// In App.tsx, provide settings API to plugins
const settingsApi = {
  read: () => window.terminalApp.settings.read(),
  update: (updates: Partial<AppSettings>) => 
    window.terminalApp.settings.update(updates),
  onChange: (listener: (settings: AppSettings) => void) => 
    window.terminalApp.settings.onChange(listener)
}
```

**Update plugin activation:**
```typescript
// Pass settings API to renderer plugin context
for (const plugin of rendererPlugins) {
  await plugin.activateRenderer?.({
    workspace,
    settings: settingsApi
  })
}
```

**Settings update flow:**
1. User changes setting in UI
2. Component calls `onUpdate(updates)`
3. Updates merged with current plugin settings
4. `window.terminalApp.settings.update()` called
5. Main process updates `SettingsStore`
6. Main process emits `settings:changed` event
7. Renderer receives event and updates state
8. UI re-renders with new settings

### 7. Styling

**New CSS file:**
- `packages/app/src/renderer/src/styles/components/settings.css`

**Key styles:**
```css
.settings-view {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  background: var(--panel-bg);
}

.settings-nav {
  border-right: 1px solid var(--border-color);
  padding: 1rem;
  overflow-y: auto;
}

.settings-content {
  padding: 2rem;
  overflow-y: auto;
}

.setting-control {
  display: grid;
  gap: 0.5rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-toggle {
  /* Toggle switch styles */
}
```

## Testing Strategy

1. **Unit Tests:**
   - Settings form controls render correctly
   - Settings updates trigger correct API calls
   - Settings navigation works

2. **Integration Tests:**
   - Terminal plugin settings view displays current values
   - Changing settings persists to YAML file
   - Settings changes trigger UI updates
   - Multiple plugins can contribute settings views

3. **Manual Testing:**
   - Open settings via toolbar action
   - Navigate between plugin settings
   - Toggle tmux settings and verify persistence
   - Restart app and verify settings retained
   - Test keyboard shortcut (Cmd+,)

## Migration Notes

- Existing settings in `settings.yaml` will continue to work
- No breaking changes to plugin API (settings view is optional)
- Terminal plugin settings default values match current behavior

## Future Enhancements

1. **Search**: Add search functionality to filter settings
2. **Validation**: Add validation for setting values
3. **Reset**: Add "Reset to defaults" button
4. **Import/Export**: Allow exporting/importing settings
5. **Settings Sync**: Cloud sync for settings across machines
6. **Advanced Mode**: Show/hide advanced settings
7. **Settings Schema**: JSON schema for plugin settings validation

## File Structure Summary

```
packages/
├── plugin-api/
│   └── src/
│       ├── plugins.ts (add SettingsViewProps, PluginSettingsViewDefinition)
│       └── settings.ts (no changes needed)
├── app/
│   └── src/
│       ├── main/
│       │   └── plugins.ts (add core settings action)
│       └── renderer/
│           └── src/
│               ├── components/
│               │   ├── SettingsView.tsx (new)
│               │   ├── SettingsNav.tsx (new)
│               │   └── SettingsFormControls.tsx (new)
│               └── styles/
│                   └── components/
│                       └── settings.css (new)
plugins/
└── plugin-default-view-terminal/
    └── src/
        ├── SettingsView.tsx (new)
        ├── index.ts (add settingsView)
        └── renderer.tsx (add settingsView with component)
```

## Implementation Order

1. ✅ Analyze current architecture (completed)
2. ⏳ Extend plugin API for settings views
3. ⏳ Create settings form controls
4. ⏳ Build core settings view container
5. ⏳ Implement terminal plugin settings view
6. ⏳ Add "Open Settings" action
7. ⏳ Wire up persistence and reactivity
8. ⏳ Add styling
9. ⏳ Test with terminal plugin

## Success Criteria

- [x] Plugin API supports settings view contributions
- [ ] Core settings view displays plugin settings
- [ ] Terminal plugin has functional settings UI
- [ ] Settings persist across app restarts
- [ ] Settings changes update UI reactively
- [ ] "Open Settings" action works from toolbar/palette
- [ ] All tmux settings are configurable via UI
- [ ] Settings UI follows existing design patterns
