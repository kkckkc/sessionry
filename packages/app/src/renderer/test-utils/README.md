# Test Utilities

## Centralized Mock Factory Pattern

### Problem

When the IPC contract (`TerminalAppBridge`) changes, every test file that mocks `window.terminalApp` needs to be updated. This leads to:
- Repetitive boilerplate across test files
- Easy to miss updates when adding new IPC methods
- Inconsistent mock implementations
- Maintenance burden

### Solution: `createMockTerminalApp()`

A centralized mock factory that provides a complete, type-safe mock of the entire `TerminalAppBridge` interface.

**Key Benefits:**
- ✅ Single source of truth for mock implementation
- ✅ Type-safe: TypeScript ensures all methods are mocked
- ✅ Easy to override specific methods in individual tests
- ✅ When IPC contract changes, only update `mockTerminalApp.ts`

### Usage

#### Basic Setup

```typescript
import { createMockTerminalApp } from '../test-utils/mockTerminalApp';

beforeEach(() => {
  global.window.terminalApp = createMockTerminalApp();
});
```

#### Override Specific Methods

```typescript
import { createMockTerminalApp } from '../test-utils/mockTerminalApp';
import { vi } from 'vitest';

it('handles VCS status', async () => {
  const mockGetStatus = vi.fn().mockResolvedValue({
    repository: { branch: 'main' },
    files: []
  });
  
  global.window.terminalApp = createMockTerminalApp({
    vcs: { getStatus: mockGetStatus }
  });
  
  // Test code that uses vcs.getStatus
  // All other methods still have default mocks
});
```

#### Override Nested Properties

```typescript
global.window.terminalApp = createMockTerminalApp({
  workspace: {
    read: vi.fn().mockReturnValue({
      projects: [{ id: 'p1', name: 'Project 1' }],
      sessions: [],
      paneGroups: [],
      panes: [],
      activeSessionId: null
    })
  },
  settings: {
    readSync: vi.fn().mockReturnValue({
      theme: 'dark',
      colorTheme: 'monokai'
    })
  }
});
```

### Migration Guide

#### Before (Old Pattern)

```typescript
// test-setup.ts or individual test file
global.window.terminalApp = {
  vcs: {
    getStatus: vi.fn(),
    getDiff: vi.fn(),
    stageFiles: vi.fn(),
    commit: vi.fn()
    // Missing: createBranch - causes runtime errors!
  },
  plugins: {
    search: vi.fn(),
    // ... many more methods
  }
  // Missing: many other required methods
} as never; // Type assertion hides missing methods
```

**Problems:**
- Incomplete mock (missing methods cause runtime errors)
- Type assertion (`as never`) bypasses type checking
- Must update when IPC contract changes

#### After (New Pattern)

```typescript
// test-setup.ts or individual test file
import { createMockTerminalApp } from '../test-utils/mockTerminalApp';

global.window.terminalApp = createMockTerminalApp();
```

**Benefits:**
- Complete mock with all methods
- Type-safe (no type assertions needed)
- Automatically includes new IPC methods when `mockTerminalApp.ts` is updated

### Maintenance

When adding a new method to `TerminalAppBridge`:

1. Add the method to `packages/app/src/preload/bridge.d.ts`
2. Update `createMockTerminalApp()` in `mockTerminalApp.ts` with a default mock
3. All tests automatically get the new mock - no need to update individual test files!

### Example: Complete Test File

```typescript
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockTerminalApp } from '../test-utils/mockTerminalApp';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    global.window.terminalApp = createMockTerminalApp();
  });

  it('displays VCS status', async () => {
    // Override just what this test needs
    global.window.terminalApp = createMockTerminalApp({
      vcs: {
        getStatus: vi.fn().mockResolvedValue({
          repository: { branch: 'feature/new-ui' },
          files: [{ path: 'src/App.tsx', status: 'M' }]
        })
      }
    });

    render(<MyComponent />);
    
    expect(await screen.findByText('feature/new-ui')).toBeInTheDocument();
  });
});
```
