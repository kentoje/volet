import { expect, it } from 'vitest';
import { BACK_COMMAND, FORWARD_COMMAND, hasRecentTabShortcut, recentTabOffset } from './recent-tab-shortcut';

it('goes back to older tabs with the back shortcut and forward to newer ones with the forward shortcut', () => {
  // Visiting A, B, then C lists C, B, A: back, back goes from C to B to A.
  expect(recentTabOffset(BACK_COMMAND)).toBe(1);
  expect(recentTabOffset(FORWARD_COMMAND)).toBe(-1);
});

it('is on while either shortcut is assigned, and off once both are removed', () => {
  const commands = (back: string, forward: string) => [
    { name: 'toggle-sidebar', shortcut: '⌥S' },
    { name: BACK_COMMAND, shortcut: back },
    { name: FORWARD_COMMAND, shortcut: forward },
  ];
  expect(hasRecentTabShortcut(commands('⌥,', '⌥.'))).toBe(true);
  expect(hasRecentTabShortcut(commands('', '⌥.'))).toBe(true);
  expect(hasRecentTabShortcut(commands('⌥,', ''))).toBe(true);
  expect(hasRecentTabShortcut(commands('', ''))).toBe(false);
  expect(hasRecentTabShortcut([{ name: 'toggle-sidebar', shortcut: '⌥S' }])).toBe(false);
});
