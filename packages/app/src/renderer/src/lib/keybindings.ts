import type { ActionDescriptor } from '@sessionry/plugin-api';

export interface KeybindingOverrides {
  custom: Record<string, string>;
  disabled: string[];
}

export interface KeybindingConflict {
  keybinding: string;
  actionIds: string[];
}

const modifierOrder = ['C', 'M', 'Shift'] as const;
type NormalizedKeybindingState = { modifiers: string[]; key?: string };

const normalizeKeybinding = (binding: string): NormalizedKeybindingState => {
  const segments = binding
    .split('-')
    .map(segment => segment.trim())
    .filter(segment => segment.length > 0);

  return segments.reduce<NormalizedKeybindingState>(
    (state, segment, index) => {
      const lowered = segment.toLowerCase();
      const isLastSegment = index === segments.length - 1;

      // Only treat 's' as Shift if it's not the last segment (i.e., it's a modifier, not the key)
      const normalizedSegment =
        lowered === 'c' ||
        lowered === 'ctrl' ||
        lowered === 'control' ||
        lowered === 'cmd' ||
        lowered === 'meta'
          ? 'C'
          : lowered === 'm' || lowered === 'alt' || lowered === 'option'
            ? 'M'
            : (lowered === 's' || lowered === 'shift') && !isLastSegment
              ? 'Shift'
              : lowered === 'enter'
                ? 'Enter'
                : lowered === 'escape' || lowered === 'esc'
                  ? 'Escape'
                  : segment.length === 1
                    ? lowered
                    : segment;

      if (modifierOrder.includes(normalizedSegment as (typeof modifierOrder)[number])) {
        if (!state.modifiers.includes(normalizedSegment)) {
          state.modifiers.push(normalizedSegment);
        }
        return state;
      }

      // If the key is a single uppercase letter, add Shift modifier
      if (segment.length === 1 && segment !== lowered) {
        if (!state.modifiers.includes('Shift')) {
          state.modifiers.push('Shift');
        }
      }

      state.key = normalizedSegment;
      return state;
    },
    { modifiers: [] }
  );
};

export const normalizeDeclaredKeybinding = (binding: string): string => {
  const normalized = normalizeKeybinding(binding);
  return [
    ...modifierOrder.filter(modifier => normalized.modifiers.includes(modifier)),
    normalized.key
  ]
    .filter((part): part is string => Boolean(part))
    .join('-');
};

export const normalizeKeyboardEvent = (
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>
): string => {
  const modifiers: string[] = [];
  if (event.ctrlKey || event.metaKey) modifiers.push('C');
  if (event.altKey) modifiers.push('M');
  if (event.shiftKey) modifiers.push('Shift');

  const rawKey =
    event.key.length === 1 ? event.key.toLowerCase() : event.key === 'Esc' ? 'Escape' : event.key;

  return [...modifierOrder.filter(modifier => modifiers.includes(modifier)), rawKey].join('-');
};

export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
};

export const createActionKeydownHandler = (
  actions: ActionDescriptor[],
  overrides: KeybindingOverrides,
  onExecute: (actionId: string) => void
) => {
  const actionByKeybinding = new Map<string, ActionDescriptor>();

  for (const action of actions) {
    // Skip if disabled
    if (overrides.disabled.includes(action.id)) {
      continue;
    }

    // Use custom keybinding if available, otherwise default
    const keybinding = overrides.custom[action.id] ?? action.defaultKeybinding;
    if (!keybinding) continue;

    const normalizedKeybinding = normalizeDeclaredKeybinding(keybinding);
    if (actionByKeybinding.has(normalizedKeybinding)) {
      console.warn(
        `[sessionry] Ignoring duplicate keybinding "${normalizedKeybinding}" for action "${action.id}".`
      );
      continue;
    }

    actionByKeybinding.set(normalizedKeybinding, action);
  }

  return (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return;

    const action = actionByKeybinding.get(normalizeKeyboardEvent(event));
    if (!action) return;

    event.preventDefault();
    onExecute(action.id);
  };
};

export const detectKeybindingConflicts = (
  actions: ActionDescriptor[],
  customKeybindings: Record<string, string>,
  disabledActionIds: string[] = []
): KeybindingConflict[] => {
  const keybindingToActions = new Map<string, string[]>();

  for (const action of actions) {
    if (disabledActionIds.includes(action.id)) continue;

    const keybinding = customKeybindings[action.id] ?? action.defaultKeybinding;
    if (!keybinding) continue;

    const normalized = normalizeDeclaredKeybinding(keybinding);
    const existing = keybindingToActions.get(normalized) ?? [];
    existing.push(action.id);
    keybindingToActions.set(normalized, existing);
  }

  return Array.from(keybindingToActions.entries())
    .filter(([_, actionIds]) => actionIds.length > 1)
    .map(([keybinding, actionIds]) => ({ keybinding, actionIds }));
};

export const isValidKeybinding = (keybinding: string): boolean => {
  try {
    const normalized = normalizeDeclaredKeybinding(keybinding);
    return normalized.length > 0;
  } catch {
    return false;
  }
};
