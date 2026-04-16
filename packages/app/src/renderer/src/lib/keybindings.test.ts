import { describe, expect, it, vi } from 'vitest'

import { createActionKeydownHandler, normalizeDeclaredKeybinding, normalizeKeyboardEvent } from './keybindings'

describe('keybindings', () => {
  it('normalizes declared and runtime keybindings into the same format', () => {
    expect(normalizeDeclaredKeybinding('Ctrl-Shift-B')).toBe('C-Shift-b')
    expect(
      normalizeKeyboardEvent({
        key: 'B',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: true
      } as KeyboardEvent)
    ).toBe('C-Shift-b')
  })

  it('executes the matching action for normalized shortcuts', () => {
    const onExecute = vi.fn()
    const preventDefault = vi.fn()
    const handleKeydown = createActionKeydownHandler(
      [{ id: 'layout:toggle-left', name: 'Toggle Left Sidebar', defaultKeybinding: 'C-b' }],
      onExecute
    )

    handleKeydown({
      key: 'b',
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      target: document.body,
      preventDefault
    } as unknown as KeyboardEvent)

    expect(preventDefault).toHaveBeenCalled()
    expect(onExecute).toHaveBeenCalledWith('layout:toggle-left')
  })

  it('suppresses shortcuts inside editable fields and keeps the first conflicting action', () => {
    const onExecute = vi.fn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const handleKeydown = createActionKeydownHandler(
      [
        { id: 'layout:toggle-left', name: 'Toggle Left Sidebar', defaultKeybinding: 'C-b' },
        { id: 'layout:toggle-right', name: 'Toggle Right Sidebar', defaultKeybinding: 'C-b' }
      ],
      onExecute
    )

    const input = document.createElement('input')
    handleKeydown({
      key: 'b',
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      target: input,
      preventDefault: vi.fn()
    } as unknown as KeyboardEvent)

    expect(onExecute).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
