import { expect, it } from 'vitest';
import { groupKeyboardShortcuts } from './keyboard-shortcuts';

it('groups opposite actions together and keeps unassigned actions visible', () => {
  const groups = groupKeyboardShortcuts([
    { name: 'cycle-recent-tabs-previous', description: 'Previous', keys: '' },
    { name: 'toggle-sidebar', description: 'Sidebar', keys: 'Alt+S' },
    { name: 'cycle-recent-tabs-subsequent', description: 'Next', keys: '' },
  ]);
  expect(groups.map((group) => group.title)).toEqual(['General', 'Cycle through preview', 'Volets', 'Tabs']);
  expect(groups[1]?.shortcuts.map((shortcut) => shortcut.name)).toEqual(['cycle-recent-tabs-previous', 'cycle-recent-tabs-subsequent']);
  expect(groups[1]?.shortcuts.every((shortcut) => shortcut.keys === '')).toBe(true);
});
