import { expect, it } from 'vitest';
import { NEXT_COMMAND, PREVIOUS_COMMAND, hasRecentTabShortcut, recentTabOffset } from './recent-tab-shortcut';

it('goes to older tabs with the previous shortcut and to newer ones with the next shortcut', () => {
  // Visiting A, B, then C lists C, B, A: previous, previous goes from C to B to A.
  expect(recentTabOffset(PREVIOUS_COMMAND)).toBe(1);
  expect(recentTabOffset(NEXT_COMMAND)).toBe(-1);
});

it('is on while either shortcut is assigned, and off once both are removed', () => {
  const commands = (previous: string, next: string) => [
    { name: 'toggle-sidebar', shortcut: '⌥S' },
    { name: PREVIOUS_COMMAND, shortcut: previous },
    { name: NEXT_COMMAND, shortcut: next },
  ];
  expect(hasRecentTabShortcut(commands('⌥,', '⌥.'))).toBe(true);
  expect(hasRecentTabShortcut(commands('', '⌥.'))).toBe(true);
  expect(hasRecentTabShortcut(commands('⌥,', ''))).toBe(true);
  expect(hasRecentTabShortcut(commands('', ''))).toBe(false);
  expect(hasRecentTabShortcut([{ name: 'toggle-sidebar', shortcut: '⌥S' }])).toBe(false);
});
