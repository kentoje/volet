/** A physical key and exact modifiers, so Shift does not turn backslash into a different binding. */
export interface PageShortcut {
  code: string;
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

type ShortcutEvent = Pick<KeyboardEvent,
  'code' | 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'repeat' | 'isComposing' | 'getModifierState'>;

/** Validate custom shortcut settings read from extension storage or a runtime message. */
export function isPageShortcut(value: unknown): value is PageShortcut {
  return (
    typeof value === 'object' && value !== null &&
    'code' in value && typeof value.code === 'string' && value.code.length > 0 && value.code.length <= 40 &&
    'key' in value && typeof value.key === 'string' && value.key.length === 1 &&
    'metaKey' in value && typeof value.metaKey === 'boolean' &&
    'ctrlKey' in value && typeof value.ctrlKey === 'boolean' &&
    'altKey' in value && typeof value.altKey === 'boolean' &&
    'shiftKey' in value && typeof value.shiftKey === 'boolean' &&
    (value.metaKey || value.ctrlKey || value.altKey)
  );
}

/** Record printable shortcut keys, including punctuation, without capturing typing or composition. */
export function recordPageShortcut(event: ShortcutEvent): PageShortcut | undefined {
  if (event.repeat || event.isComposing || event.getModifierState('AltGraph')) return undefined;
  const shortcut = {
    code: event.code,
    // Keep the backslash label when Shift produces a pipe on this key.
    key: event.code === 'Backslash' && event.key === '|' ? '\\' : event.key,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
  };
  return isPageShortcut(shortcut) ? shortcut : undefined;
}

/** Match a custom shortcut by physical key and every modifier, including Shift. */
export function matchesPageShortcut(event: Omit<PageShortcut, 'key'>, shortcut: PageShortcut): boolean {
  return event.code === shortcut.code && event.metaKey === shortcut.metaKey &&
    event.ctrlKey === shortcut.ctrlKey && event.altKey === shortcut.altKey && event.shiftKey === shortcut.shiftKey;
}

/** Display custom shortcut modifiers explicitly, keeping punctuation such as backslash readable. */
export function formatPageShortcut(shortcut: PageShortcut): string {
  return [
    shortcut.ctrlKey && 'Ctrl',
    shortcut.altKey && 'Alt',
    shortcut.metaKey && 'Cmd',
    shortcut.shiftKey && 'Shift',
    shortcut.key.toUpperCase(),
  ].filter(Boolean).join('+');
}

/** Website access is optional and requested only when a custom page shortcut is enabled. */
export const PAGE_SHORTCUT_ORIGINS = ['http://*/*', 'https://*/*'];
