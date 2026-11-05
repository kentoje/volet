import { describe, expect, it, vi } from 'vitest';

// archive.ts talks to Chrome and storage for the side effects; only the pure rule is tested here.
vi.mock('wxt/utils/storage', () => ({ storage: { defineItem: () => ({}) } }));
vi.mock('wxt/browser', () => ({ browser: {} }));

const { idleTabs } = await import('./archive');

const HOUR = 3_600_000;
const base = { windowId: 1, index: 0, active: false, pinned: false, groupId: -1, url: 'https://example.com' };
const tabs = [
  { ...base, id: 1 }, // idle long enough
  { ...base, id: 2, active: true },
  { ...base, id: 3, pinned: true },
  { ...base, id: 4, audible: true },
  { ...base, id: 5 }, // bound to a pin
  { ...base, id: 6 }, // recently used
  { ...base, id: 7, url: 'chrome://newtab/' },
  { ...base, id: 8 }, // never seen yet
] as chrome.tabs.Tab[];

describe('idleTabs', () => {
  it('only archives unpinned, inactive, silent temporary tabs past the limit', () => {
    const now = 100 * HOUR;
    const activity = { 1: now - 13 * HOUR, 2: 0, 3: 0, 4: 0, 5: 0, 6: now - HOUR, 7: 0 };
    const result = idleTabs({
      tabs,
      activity,
      bindings: { 5: { kind: 'pin', id: 'p' } },
      limitMs: 12 * HOUR,
      now,
    });
    expect(result.map((tab) => tab.id)).toEqual([1]);
  });
});
