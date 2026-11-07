/** Chrome reports platform-formatted shortcuts, including modifier symbols on macOS. */
export type CycleModifier = 'metaKey' | 'ctrlKey' | 'altKey';

/** Native shortcuts are independent; an empty previous binding enables the Shift fallback. */
export interface RecentTabBindings {
  next: string;
  previous: string;
}

/** Find the primary held modifier from Chrome's configured shortcut. Shift is optional. */
export function recentTabModifier(shortcut: string): CycleModifier | undefined {
  if (/Command|Cmd|⌘/i.test(shortcut)) return 'metaKey';
  if (/Ctrl|Control|⌃/i.test(shortcut)) return 'ctrlKey';
  if (/Alt|Option|⌥/i.test(shortcut)) return 'altKey';
  return undefined;
}

/** Match the reverse binding by flipping Shift on Chrome's configured cycle shortcut. */
export function isPreviousTabShortcut(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
  shortcut: string,
): boolean {
  if (!recentTabModifier(shortcut)) return false;
  const shifted = /Shift|⇧/i.test(shortcut);
  if (event.shiftKey === shifted ||
    event.metaKey !== /Command|Cmd|⌘/i.test(shortcut) ||
    event.ctrlKey !== /Ctrl|Control|⌃/i.test(shortcut) ||
    event.altKey !== /Alt|Option|⌥/i.test(shortcut)) return false;
  const key = shortcut.replace(/[⌘⌃⌥⇧]/g, '').split('+').at(-1)?.toLowerCase();
  if (!key) return false;
  const names: Record<string, string> = {
    up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright',
    comma: 'comma', period: 'period', space: 'space',
  };
  return event.key.toLowerCase() === key || event.code.toLowerCase() === (names[key] ?? key) ||
    event.code.toLowerCase() === `key${key}` || event.code.toLowerCase() === `digit${key}`;
}
