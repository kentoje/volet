/** Chrome reports platform-formatted shortcuts, including modifier symbols on macOS. */
export type CycleModifier = 'metaKey' | 'ctrlKey' | 'altKey';

/** Find the primary held modifier from Chrome's configured shortcut. Shift is optional. */
export function recentTabModifier(shortcut: string): CycleModifier | undefined {
  if (/Command|Cmd|⌘/i.test(shortcut)) return 'metaKey';
  if (/Ctrl|Control|⌃/i.test(shortcut)) return 'ctrlKey';
  if (/Alt|Option|⌥/i.test(shortcut)) return 'altKey';
  return undefined;
}

/** The switcher's two shortcuts, named by what they do: back goes to older tabs, forward to newer ones. */
export const BACK_COMMAND = 'cycle-recent-tabs-previous';
export const FORWARD_COMMAND = 'cycle-recent-tabs';
export type RecentTabCommand = typeof BACK_COMMAND | typeof FORWARD_COMMAND;

/**
 * A step along the recent tabs, most recent first: back goes one tab further into the past, forward comes back toward
 * the current tab. Either one's first press selects the previous tab (`RecentTabCycle.step`).
 */
export function recentTabOffset(command: RecentTabCommand): 1 | -1 {
  return command === BACK_COMMAND ? 1 : -1;
}

/** Whether either switcher shortcut is assigned: removing both turns the switcher off. */
export function hasRecentTabShortcut(commands: readonly { name?: string; shortcut?: string }[]): boolean {
  return commands.some((command) => (command.name === BACK_COMMAND || command.name === FORWARD_COMMAND) && Boolean(command.shortcut));
}

/** Validate a modifier at the extension message boundary. */
export function isCycleModifier(value: unknown): value is CycleModifier {
  return value === 'metaKey' || value === 'ctrlKey' || value === 'altKey';
}
