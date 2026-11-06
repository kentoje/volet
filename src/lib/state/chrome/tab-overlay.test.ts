import { describe, expect, it } from 'vitest';
import type { LiveTab } from '@/lib/model/types';
import { TabOverlay, isLiveChange } from './tab-overlay';

const queried = (status: LiveTab['status']): Map<number, LiveTab> =>
  new Map([[1, { id: 1, title: 'New Tab', url: 'chrome://newtab/', status }]]);

describe('TabOverlay', () => {
  it('lets the latest event win over a lagging query', () => {
    const overlay = new TabOverlay();
    overlay.record(1, { status: 'loading', url: 'chrome://newtab/' });
    overlay.record(1, { status: 'complete' });
    // The query right after the "complete" event still says loading.
    expect(overlay.apply(queried('loading')).get(1)?.status).toBe('complete');
  });

  it('keeps fields events never mentioned, and forgets closed tabs', () => {
    const overlay = new TabOverlay();
    overlay.record(1, { title: 'Inbox (3)', mutedInfo: { muted: true } });
    expect(overlay.apply(queried('complete')).get(1)).toMatchObject({ title: 'Inbox (3)', muted: true, url: 'chrome://newtab/' });
    overlay.forget(1);
    expect(overlay.apply(queried('loading')).get(1)?.status).toBe('loading');
  });

  it('ignores changes it does not track', () => {
    const overlay = new TabOverlay();
    overlay.record(1, {});
    expect(overlay.apply(queried('loading')).get(1)?.status).toBe('loading');
  });

  it('patches one tab with its latest values, and leaves the map alone otherwise', () => {
    const overlay = new TabOverlay();
    const tabs = queried('loading');
    expect(overlay.patch(tabs, 1)).toBe(tabs); // nothing recorded yet
    overlay.record(1, { status: 'complete', title: 'Inbox' });
    const patched = overlay.patch(tabs, 1);
    expect(patched).not.toBe(tabs);
    expect(patched.get(1)).toMatchObject({ status: 'complete', title: 'Inbox', url: 'chrome://newtab/' });
    expect(overlay.patch(tabs, 2)).toBe(tabs); // not in the map
  });
});

describe('isLiveChange', () => {
  it('is true only for changes a row shows by itself', () => {
    expect(isLiveChange({ status: 'loading', url: 'https://a' })).toBe(true);
    expect(isLiveChange({ title: 'A', favIconUrl: 'x', audible: true, mutedInfo: { muted: false } })).toBe(true);
    expect(isLiveChange({ groupId: 4 })).toBe(false);
    expect(isLiveChange({ title: 'A', pinned: true })).toBe(false);
    expect(isLiveChange({ discarded: true })).toBe(false);
    expect(isLiveChange({})).toBe(false);
  });
});
