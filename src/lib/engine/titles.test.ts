import { describe, expect, it, vi } from 'vitest';

// titles.ts talks to Chrome and storage for the side effects; only the pure rules are tested here.
vi.mock('wxt/utils/storage', () => ({ storage: { defineItem: () => ({}) } }));
vi.mock('wxt/browser', () => ({ browser: {} }));

const { refreshedTitle, titleSignature } = await import('./titles');

const bookmark = { url: 'https://claude.ai/project/42', title: 'Page not found – Claude' };
const loaded = { url: 'https://claude.ai/project/42', title: 'Volet – Claude' };

describe('refreshedTitle', () => {
  it("takes the page's title once the tab has loaded the bookmark's page", () => {
    expect(refreshedTitle({ bookmark, tab: loaded, named: new Set() })).toBe('Volet – Claude');
  });

  it('keeps a title the user chose', () => {
    const named = new Set([titleSignature(bookmark.url, bookmark.title)]);
    expect(refreshedTitle({ bookmark, tab: loaded, named })).toBeUndefined();
  });

  it('ignores the tab once it has moved to another page', () => {
    const elsewhere = { url: 'https://claude.ai/project/43', title: 'Other – Claude' };
    expect(refreshedTitle({ bookmark, tab: elsewhere, named: new Set() })).toBeUndefined();
  });

  it('treats small URL differences as the same page', () => {
    const tab = { url: 'https://claude.ai/project/42/?utm_source=x', title: 'Volet – Claude' };
    expect(refreshedTitle({ bookmark, tab, named: new Set() })).toBe('Volet – Claude');
  });

  it('skips empty titles, unchanged ones, and the address Chrome shows for untitled pages', () => {
    const named = new Set<string>();
    expect(refreshedTitle({ bookmark, tab: { url: loaded.url, title: ' ' }, named })).toBeUndefined();
    expect(refreshedTitle({ bookmark, tab: { url: loaded.url, title: bookmark.title }, named })).toBeUndefined();
    expect(refreshedTitle({ bookmark, tab: { url: loaded.url, title: 'claude.ai/project/42' }, named })).toBeUndefined();
  });
});

describe('titleSignature', () => {
  it('is short and changes with the URL or the title', () => {
    const base = titleSignature('https://a.example', 'A');
    expect(base.length).toBeLessThanOrEqual(7);
    expect(titleSignature('https://a.example', 'A')).toBe(base);
    expect(titleSignature('https://b.example', 'A')).not.toBe(base);
    expect(titleSignature('https://a.example', 'B')).not.toBe(base);
  });
});
