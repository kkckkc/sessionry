# Dialog Button Refactoring Plan

## Problem
The Create Session dialog in `App.tsx` uses plain HTML buttons instead of the `Button` component from `@sessionry/components`.

## Current Implementation
Location: `/packages/app/src/renderer/src/App.tsx` (lines 157-162)

```tsx
<div className="actions">
  <DialogClose className="btn is-ghost" type="button">
    Cancel
  </DialogClose>
  <button type="submit" className="btn">
    Run
  </button>
</div>
```

## Target Implementation

### Import Statement
Add Button import to the existing imports from `@sessionry/components`:

```tsx
import { 
  DialogRoot, 
  DialogPortal, 
  DialogBackdrop, 
  DialogPopup, 
  DialogTitle, 
  DialogDescription, 
  DialogClose,
  Button  // Add this
} from '@sessionry/components'
```

### Refactored Buttons

#### Cancel Button
Replace the DialogClose with Button wrapped in DialogClose:

```tsx
<DialogClose asChild>
  <Button variant="ghost" type="button">
    Cancel
  </Button>
</DialogClose>
```

**Rationale:**
- Uses `asChild` prop to merge Button with DialogClose functionality
- Maintains ghost variant styling
- Preserves button type="button" to prevent form submission

#### Run Button
Replace plain button with Button component:

```tsx
<Button type="submit">
  Run
</Button>
```

**Rationale:**
- Uses default variant (no need to specify)
- Maintains submit type for form submission
- Provides consistent styling and accessibility

### Complete Refactored Section

```tsx
<div className="actions">
  <DialogClose asChild>
    <Button variant="ghost" type="button">
      Cancel
    </Button>
  </DialogClose>
  <Button type="submit">
    Run
  </Button>
</div>
```

## Benefits

1. **Consistency**: Uses the same Button component across the application
2. **Accessibility**: Leverages Base UI's built-in accessibility features
3. **Maintainability**: Single source of truth for button styling and behavior
4. **Future-proofing**: Easy to add tooltips or other Button features if needed

## Implementation Steps

1. Add `Button` to the import statement from `@sessionry/components`
2. Replace the Cancel button (DialogClose) with Button wrapped in DialogClose using `asChild`
3. Replace the Run button with the Button component
4. Test the dialog functionality:
   - Cancel button closes the dialog
   - Run button submits the form
   - Keyboard navigation works correctly
   - Visual styling matches the design system

## Testing Checklist

- [ ] Dialog opens when triggering Create Session action
- [ ] Cancel button closes the dialog without submitting
- [ ] Run button submits the form and executes the action
- [ ] Tab navigation works between form fields and buttons
- [ ] Enter key on form fields submits the form
- [ ] Escape key closes the dialog
- [ ] Visual styling matches other buttons in the app
- [ ] Ghost variant styling is correct on Cancel button

## Notes

- The `asChild` prop is a Radix UI pattern (which Base UI follows) that allows composition by merging the child component with the parent's functionality
- No changes needed to CSS since Button component already uses the same class names (`btn`, `is-ghost`)
- The DialogClose component needs to wrap the Button to maintain the close-on-click behavior
