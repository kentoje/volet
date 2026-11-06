import { describe, expect, it, vi } from 'vitest';
import type { Tab } from './context';

// context.ts talks to Chrome and storage; only the pure choice is tested here.
vi.mock('wxt/utils/storage', () => ({ storage: { defineItem: () => ({}) } }));
vi.mock('wxt/browser', () => ({ browser: {} }));

const { successorOf } = await import('./successor');

const tab = (id: number, index: number, extra: Partial<Tab> = {}): Tab =>
  ({ id, index, windowId: 1, active: false, pinned: false, groupId: 5, url: `https://example.com/${id}`, ...extra }) as Tab;

describe('successorOf', () => {
  it('shows the next tab of the Space, else the last one', () => {
    const tabs = [tab(1, 3), tab(2, 4, { active: true }), tab(3, 5)];
    expect(successorOf({ active: tabs[1]!, leaving: [tabs[1]!], spaceTabs: tabs, favorites: [] })).toEqual({
      kind: 'tab',
      tabId: 3,
    });
    expect(successorOf({ active: tabs[2]!, leaving: [tabs[2]!], spaceTabs: tabs, favorites: [] })).toEqual({
      kind: 'tab',
      tabId: 2,
    });
  });

  it('skips every leaving tab', () => {
    const tabs = [tab(1, 3), tab(2, 4, { active: true }), tab(3, 5)];
    const leaving = [tabs[1]!, tabs[2]!];
    expect(successorOf({ active: tabs[1]!, leaving, spaceTabs: tabs, favorites: [] })).toEqual({
      kind: 'tab',
      tabId: 1,
    });
  });

  it('shows the favorite used last when the Space empties, leaving it empty', () => {
    const last = tab(9, 3, { active: true });
    const favorites = [
      tab(1, 0, { pinned: true, lastAccessed: 100 }),
      tab(2, 1, { pinned: true, lastAccessed: 300 }),
      tab(3, 2, { pinned: true, lastAccessed: 200 }),
    ];
    expect(successorOf({ active: last, leaving: [last], spaceTabs: [last], favorites })).toEqual({
      kind: 'tab',
      tabId: 2,
    });
  });

  it('opens a new tab in the Space when no favorite is open', () => {
    const last = tab(9, 0, { active: true });
    expect(successorOf({ active: last, leaving: [last], spaceTabs: [last], favorites: [] })).toEqual({
      kind: 'new-tab',
    });
  });

  it("never replaces a New Tab page with another one, so it can be closed", () => {
    const blank = tab(9, 0, { active: true, url: 'chrome://newtab/' });
    expect(successorOf({ active: blank, leaving: [blank], spaceTabs: [blank], favorites: [] })).toEqual({
      kind: 'chrome',
    });
  });
});
