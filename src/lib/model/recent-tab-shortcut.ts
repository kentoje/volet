/** Chrome reports platform-formatted shortcuts, including modifier symbols on macOS. */
export type CycleModifier = 'metaKey' | 'ctrlKey' | 'altKey';

/** Find the primary held modifier from Chrome's configured shortcut. Shift is optional. */
export function recentTabModifier(shortcut: string): CycleModifier | undefined {
  if (/Command|Cmd|⌘/i.test(shortcut)) return 'metaKey';
  if (/Ctrl|Control|⌃/i.test(shortcut)) return 'ctrlKey';
  if (/Alt|Option|⌥/i.test(shortcut)) return 'altKey';
  return undefined;
}

/** The switcher's two shortcuts: previous goes to older tabs, next to newer ones. */
export const PREVIOUS_COMMAND = 'cycle-recent-tabs-previous';
/** Named so it sorts after "previous": Chrome's shortcuts page lists commands by id. */
export const NEXT_COMMAND = 'cycle-recent-tabs-subsequent';
export type RecentTabCommand = typeof PREVIOUS_COMMAND | typeof NEXT_COMMAND;

/**
 * A step along the recent tabs, most recent first, from the current tab: previous goes one tab further into the past
 * (first, the previous tab), next comes back toward the current tab (first, wrapping to the oldest). See
 * `RecentTabCycle.step`.
 */
export function recentTabOffset(command: RecentTabCommand): 1 | -1 {
  return command === PREVIOUS_COMMAND ? 1 : -1;
}

/** Whether either switcher shortcut is assigned: removing both turns the switcher off. */
export function hasRecentTabShortcut(commands: readonly { name?: string; shortcut?: string }[]): boolean {
  return commands.some((command) => (command.name === PREVIOUS_COMMAND || command.name === NEXT_COMMAND) && Boolean(command.shortcut));
}

/** Validate a modifier at the extension message boundary. */
export function isCycleModifier(value: unknown): value is CycleModifier {
  return value === 'metaKey' || value === 'ctrlKey' || value === 'altKey';
}
