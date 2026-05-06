import type { ActionDescriptor } from '@sessionry/plugin-api';

const modifierOrder = ['C', 'M', 'Shift'] as const;
type NormalizedKeybindingState = { modifiers: string[]; key?: string };

const normalizeKeybinding = (binding: string): NormalizedKeybindingState =>
  binding
    .split('-')
    .map(segment => segment.trim())
    .filter(segment => segment.length > 0)
    .reduce<NormalizedKeybindingState>(
      (state, segment) => {
        const lowered = segment.toLowerCase();
        const normalizedSegment =
          lowered === 'c' ||
          lowered === 'ctrl' ||
          lowered === 'control' ||
          lowered === 'cmd' ||
          lowered === 'meta'
            ? 'C'
            : lowered === 'm' || lowered === 'alt' || lowered === 'option'
              ? 'M'
              : lowered === 'shift'
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

        state.key = normalizedSegment;
        return state;
      },
      { modifiers: [] }
    );

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
  onExecute: (actionId: string) => void
) => {
  const actionByKeybinding = new Map<string, ActionDescriptor>();

  for (const action of actions) {
    if (!action.defaultKeybinding) continue;

    const normalizedKeybinding = normalizeDeclaredKeybinding(action.defaultKeybinding);
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
