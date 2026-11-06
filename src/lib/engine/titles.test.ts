import { describe, expect, it, vi } from 'vitest';

// titles.ts talks to Chrome and storage for the side effects; only the pure rule is tested here.
vi.mock('wxt/utils/storage', () => ({ storage: { defineItem: () => ({}) } }));
vi.mock('wxt/browser', () => ({ browser: {} }));

const { refreshedTitle } = await import('./titles');

const bookmark = { url: 'https://claude.ai/project/42', title: 'Page not found – Claude' };
const loaded = { url: 'https://claude.ai/project/42', title: 'Volet – Claude' };
/** The bookmark still has the title Volet gave it. */
const auto = bookmark.title;

describe('refreshedTitle', () => {
  it("takes the page's title once the tab has loaded the bookmark's page", () => {
    expect(refreshedTitle({ bookmark, tab: loaded, auto })).toBe('Volet – Claude');
  });

  it('never touches a title someone changed, in Volet or elsewhere', () => {
    expect(refreshedTitle({ bookmark: { ...bookmark, title: 'My project' }, tab: loaded, auto })).toBeUndefined();
  });

  it("never touches a title Volet didn't give (from before, or another device)", () => {
    expect(refreshedTitle({ bookmark, tab: loaded, auto: undefined })).toBeUndefined();
  });

  it('ignores the tab once it has moved to another page', () => {
    const elsewhere = { url: 'https://claude.ai/project/43', title: 'Other – Claude' };
    expect(refreshedTitle({ bookmark, tab: elsewhere, auto })).toBeUndefined();
  });

  it('treats small URL differences as the same page', () => {
    const tab = { url: 'https://claude.ai/project/42/?utm_source=x', title: 'Volet – Claude' };
    expect(refreshedTitle({ bookmark, tab, auto })).toBe('Volet – Claude');
  });

  it('skips empty titles, unchanged ones, and the address Chrome shows for untitled pages', () => {
    expect(refreshedTitle({ bookmark, tab: { url: loaded.url, title: ' ' }, auto })).toBeUndefined();
    expect(refreshedTitle({ bookmark, tab: { url: loaded.url, title: bookmark.title }, auto })).toBeUndefined();
    expect(refreshedTitle({ bookmark, tab: { url: loaded.url, title: 'claude.ai/project/42' }, auto })).toBeUndefined();
  });
});
