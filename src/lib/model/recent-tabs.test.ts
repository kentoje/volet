import { describe, expect, it } from 'vitest';
import { isRecentTab, orderRecentTabs } from './recent-tabs';
import { isPreviousTabShortcut, recentTabModifier } from './recent-tab-shortcut';

describe('recent tab order', () => {
  it('keeps the active tab first, removes closed tabs, and limits the list to five', () => {
    const tabs = Array.from({ length: 7 }, (_, id) => ({ id, active: id === 2, lastAccessed: id * 10 }));
    expect(orderRecentTabs(tabs, [99, 1, 4, 2]).map((tab) => tab.id)).toEqual([2, 1, 4, 6, 5]);
    expect(tabs.map((tab) => tab.id)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('falls back to Chrome recency after a restart', () => {
    expect(orderRecentTabs([
      { id: 1, active: false, lastAccessed: 20 },
      { id: 2, active: true, lastAccessed: 10 },
      { id: 3, active: false, lastAccessed: 30 },
    ], []).map((tab) => tab.id)).toEqual([2, 3, 1]);
    expect(orderRecentTabs([], [])).toEqual([]);
  });
});

it('validates the recent tab message boundary', () => {
  expect(isRecentTab({ id: 1, title: 'Tab', url: 'https://example.com' })).toBe(true);
  expect(isRecentTab({ id: '1', title: 'Tab', url: '' })).toBe(false);
  expect(isRecentTab({ id: 1, title: 'Tab', url: '', preview: 'https://remote.example/image' })).toBe(false);
  expect(isRecentTab({ id: 1, title: 'Tab', url: '', icon: 'chrome-extension://id/_favicon/' })).toBe(false);
  expect(isRecentTab({ id: 1, title: 'Tab', url: '', icon: 'data:image/png;base64,AAAA' })).toBe(true);
});

it('recognizes platform shortcut modifiers without assuming Cmd+E', () => {
  expect(recentTabModifier('⌘E')).toBe('metaKey');
  expect(recentTabModifier('Command+Shift+E')).toBe('metaKey');
  expect(recentTabModifier('Ctrl+Shift+Y')).toBe('ctrlKey');
  expect(recentTabModifier('⌥Q')).toBe('altKey');
  expect(recentTabModifier('Alt+Q')).toBe('altKey');
  expect(recentTabModifier('')).toBeUndefined();
});

it('derives backward cycling from the configured shortcut and requires the opposite Shift state', () => {
  const event = { key: 'E', code: 'KeyE', metaKey: true, ctrlKey: false, altKey: false, shiftKey: true };
  expect(isPreviousTabShortcut(event, '⌘E')).toBe(true);
  expect(isPreviousTabShortcut(event, 'Command+E')).toBe(true);
  expect(isPreviousTabShortcut({ ...event, shiftKey: false }, '⌘E')).toBe(false);
  expect(isPreviousTabShortcut({ ...event, metaKey: false }, '⌘E')).toBe(false);
  expect(isPreviousTabShortcut({ ...event, altKey: true }, '⌘E')).toBe(false);
  expect(isPreviousTabShortcut(event, '⌘Y')).toBe(false);
  expect(isPreviousTabShortcut(event, '')).toBe(false);
  expect(isPreviousTabShortcut({ ...event, shiftKey: false }, '⌘⇧E')).toBe(true);
  expect(isPreviousTabShortcut({ ...event, metaKey: false, ctrlKey: true }, 'Ctrl+E')).toBe(true);
  expect(isPreviousTabShortcut({ ...event, key: 'Œ', code: 'KeyQ', metaKey: false, altKey: true }, '⌥Q')).toBe(true);
});
