# Markdown Preview Implementation Plan

## Overview

Add the ability to toggle between text editing and preview mode when viewing markdown files in the code pane. The toggle will be accessible via an icon button in the pane title bar.

## Current Architecture Analysis

### Code Pane Structure
- **Location**: `plugins/plugin-default-view-code/src/renderer.tsx`
- **Editor**: Uses CodeMirror 6 with markdown language support
- **State Management**: Pane state stored in `pane.state` (workspace API)
- **Title Bar**: Uses `PaneTitle` component from `plugin-default-view-workspace`

### Key Components
1. **CodePaneView** - Main component rendering the editor
2. **PaneTitle** - Title bar component with support for actions
3. **Pane State** - Stored in workspace, includes:
   - `filePath`: string
   - `content`: string (optional inline content)
   - `readOnly`: boolean
   - `isDirty`: boolean
   - Custom properties can be added

## Implementation Plan

### 1. Add Markdown Rendering Library

**Decision**: Use `react-markdown` with `remark-gfm` for GitHub Flavored Markdown support

**Rationale**:
- Well-maintained and widely used
- Good React integration
- Supports GFM (tables, task lists, strikethrough, etc.)
- Extensible with plugins
- Better security than `dangerouslySetInnerHTML`

**Dependencies to add** (in `plugin-default-view-code/package.json`):
```json
{
  "dependencies": {
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0"
  }
}
```

### 2. State Management Design

**Pane State Extension**:
Add `viewMode` property to pane state:
```typescript
interface CodePaneState {
  filePath?: string
  content?: string
  readOnly?: boolean
  isDirty?: boolean
  viewMode?: 'edit' | 'preview'  // NEW
}
```

**Default Behavior**:
- Default to `'edit'` mode for all files
- Persist mode in pane state so it survives pane switches
- Mode is per-pane (different panes can have different modes)

### 3. UI Components

#### 3.1 Toggle Button in PaneTitle

Add an icon button to the PaneTitle actions area:
- **Icon**: Use `TbEye` (preview) and `TbEdit` (edit) from `react-icons/tb`
- **Position**: Right side of title bar, before any existing actions
- **Tooltip**: "Toggle Preview" or "Toggle Edit"
- **Keyboard Shortcut**: Consider `Cmd/Ctrl + Shift + V` (common for preview)

#### 3.2 Markdown Preview Component

Create new component: `MarkdownPreview.tsx`

**Features**:
- Render markdown content using `react-markdown`
- Apply syntax highlighting for code blocks (using `rehype-highlight`)
- Style to match editor theme
- Support GFM features (tables, task lists, etc.)
- Handle relative image paths (if applicable)
- Scrollable content area

**Styling**:
- Use CSS variables from design tokens
- Match CodeMirror editor styling for consistency
- Proper spacing and typography
- Code block styling matching syntax theme

### 4. Implementation Steps

#### Step 1: Add Dependencies
```bash
pnpm --filter @sessionry/plugin-default-view-code add react-markdown remark-gfm rehype-highlight
```

#### Step 2: Create MarkdownPreview Component

**File**: `plugins/plugin-default-view-code/src/MarkdownPreview.tsx`

```typescript
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export const MarkdownPreview = ({ content, className = '' }: MarkdownPreviewProps) => {
  return (
    <div className={`markdown-preview ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

#### Step 3: Add Styling

**File**: `plugins/plugin-default-view-code/src/markdown-preview.css`

Create comprehensive styles for:
- Container layout (scrollable, padded)
- Typography (headings, paragraphs, lists)
- Code blocks (inline and fenced)
- Tables (GFM)
- Task lists (GFM)
- Links and images
- Blockquotes
- Horizontal rules

Use CSS variables for theming:
```css
.markdown-preview {
  padding: 1.5rem;
  overflow-y: auto;
  height: 100%;
  background: var(--workspace-bg);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
}

.markdown-preview h1 {
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  /* ... */
}

/* More styles... */
```

#### Step 4: Modify CodePaneView Component

**Changes to `renderer.tsx`**:

1. **Import new components**:
```typescript
import { TbEye, TbEdit } from 'react-icons/tb'
import { MarkdownPreview } from './MarkdownPreview'
import { PaneTitle } from '@sessionry/plugin-default-view-workspace/components/PaneTitle'
```

2. **Add view mode state**:
```typescript
const viewMode = (pane.state.viewMode as 'edit' | 'preview') || 'edit'
const isMarkdown = getFileExtension(languagePath) === '.md'
```

3. **Add toggle handler**:
```typescript
const handleToggleViewMode = useCallback(async () => {
  const newMode = viewMode === 'edit' ? 'preview' : 'edit'
  const paneHandle = workspace.getPane(paneIdRef.current)
  const currentState = paneHandle?.data.state
  if (currentState) {
    await paneHandle?.update({ 
      state: { ...currentState, viewMode: newMode } 
    })
  }
}, [viewMode, workspace])
```

4. **Render PaneTitle with toggle button**:
```typescript
const renderPaneTitle = () => {
  if (!isMarkdown) return null
  
  const ToggleIcon = viewMode === 'edit' ? TbEye : TbEdit
  const tooltipText = viewMode === 'edit' ? 'Preview' : 'Edit'
  
  return (
    <PaneTitle
      title={getFileName(filePath)}
      isDirty={!isReadOnly && content !== savedContentRef.current}
      actions={
        <button
          className="pane-title-action-button"
          onClick={handleToggleViewMode}
          title={tooltipText}
          aria-label={tooltipText}
        >
          <ToggleIcon size={16} />
        </button>
      }
    />
  )
}
```

5. **Conditional rendering**:
```typescript
return (
  <section className="code-pane">
    {renderPaneTitle()}
    {status === 'loading' && <div className="code-pane-status">Loading file…</div>}
    {isSaving && <div className="code-pane-status">Saving…</div>}
    {errorMessage && <div className="code-pane-status is-error">{errorMessage}</div>}
    {status === 'ready' && (
      <>
        {viewMode === 'edit' && (
          <div className="code-pane-editor" ref={editorRootRef} />
        )}
        {viewMode === 'preview' && isMarkdown && (
          <MarkdownPreview content={content} />
        )}
      </>
    )}
  </section>
)
```

#### Step 5: Add Keyboard Shortcut (Optional)

Add to CodeMirror keymap:
```typescript
const previewKeymap = keymap.of([
  {
    key: 'Mod-Shift-v',
    preventDefault: true,
    run: () => {
      if (isMarkdown) {
        void handleToggleViewMode()
        return true
      }
      return false
    }
  }
])
```

### 5. Testing Strategy

#### Manual Testing Checklist
- [ ] Toggle between edit and preview modes
- [ ] Verify markdown rendering (headings, lists, code blocks)
- [ ] Test GFM features (tables, task lists, strikethrough)
- [ ] Verify syntax highlighting in code blocks
- [ ] Test with large markdown files
- [ ] Verify state persistence when switching panes
- [ ] Test dirty state indicator in both modes
- [ ] Test read-only files in preview mode
- [ ] Verify keyboard shortcut (if implemented)
- [ ] Test theme switching (light/dark)

#### Edge Cases
- Empty markdown files
- Markdown files with inline content (no file path)
- Very large files (performance)
- Files with relative image paths
- Malformed markdown

### 6. Future Enhancements

**Phase 2 Considerations**:
1. **Split View**: Show edit and preview side-by-side
2. **Sync Scrolling**: Keep edit and preview scroll positions in sync
3. **Live Preview**: Update preview as you type (debounced)
4. **Export Options**: Export to HTML, PDF
5. **Custom Markdown Extensions**: Support for custom syntax
6. **Image Handling**: Better support for relative paths and embedded images
7. **Table of Contents**: Auto-generated TOC for long documents
8. **Mermaid Diagrams**: Support for diagram rendering

### 7. Documentation Updates

**Files to Update**:
1. `plugins/plugin-default-view-code/README.md` - Add markdown preview feature
2. User documentation (if exists) - Add usage instructions
3. Plugin API docs - Document pane state extension

**Documentation Content**:
- How to toggle preview mode
- Keyboard shortcuts
- Supported markdown features (GFM)
- Limitations and known issues

## Technical Considerations

### Performance
- **Large Files**: Preview rendering may be slow for very large files
  - Consider lazy rendering or virtualization for large documents
  - Add loading indicator for preview rendering
  
### Security
- **XSS Prevention**: `react-markdown` is safe by default (no `dangerouslySetInnerHTML`)
- **Link Handling**: External links should open in default browser, not in Electron

### Accessibility
- **Keyboard Navigation**: Ensure toggle button is keyboard accessible
- **Screen Readers**: Proper ARIA labels for mode indicators
- **Focus Management**: Maintain focus when switching modes

### Theme Integration
- Preview styles should respect current theme
- Code blocks should use same syntax highlighting as editor
- Consider adding theme-specific markdown styles

## Success Criteria

- ✅ User can toggle between edit and preview modes for markdown files
- ✅ Toggle button appears in pane title for markdown files only
- ✅ Preview renders markdown correctly with GFM support
- ✅ View mode persists when switching between panes
- ✅ Dirty state indicator works in both modes
- ✅ Preview styling matches editor theme
- ✅ No performance degradation for non-markdown files
- ✅ Code is well-tested and documented

## Timeline Estimate

- **Setup & Dependencies**: 30 minutes
- **MarkdownPreview Component**: 2 hours
- **CodePaneView Integration**: 2 hours
- **Styling**: 2 hours
- **Testing**: 2 hours
- **Documentation**: 1 hour

**Total**: ~9-10 hours

## Next Steps

1. Review and approve this plan
2. Switch to `code` mode to begin implementation
3. Start with Step 1 (Add Dependencies)
4. Implement components incrementally
5. Test thoroughly at each step
6. Update documentation
