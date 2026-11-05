import { describe, expect, it } from 'vitest';
import type { LiveTab } from '@/lib/model/types';
import { TabOverlay } from './tab-overlay';

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
});
