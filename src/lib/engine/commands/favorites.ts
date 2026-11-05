import { browser } from 'wxt/browser';
import { boundTab, loadContext, tabUrl } from '../context';
import { retry } from '../retry';
import { setBinding } from '../session';
import { findBookmark } from '../snapshot';
import { deleteBookmark } from './bookmarks';
import type { Handlers } from './types';

/** Favorites are bookmarks in the Favorites folder; when open, they are Chrome's native pinned tabs. */
export const favoriteHandlers = {
  async openFavorite({ windowId, favoriteId }) {
    const ctx = await loadContext(windowId);
    const bound = boundTab(ctx, favoriteId);
    if (bound?.id !== undefined) {
      await retry(() => browser.tabs.update(bound.id!, { active: true }));
      return bound.id;
    }
    const favorite = findBookmark(ctx.root, favoriteId);
    if (!favorite?.url) return;
    const tab = await browser.tabs.create({ windowId, url: favorite.url, pinned: true, active: true });
    await setBinding(ctx, tab.id!, { kind: 'favorite', id: favorite.id });
    return tab.id;
  },

  async addFavorite({ windowId, tabId, index }) {
    const ctx = await loadContext(windowId);
    const tab = ctx.tabs.find((t) => t.id === tabId);
    const url = tab && tabUrl(tab);
    if (!tab || !url) return;
    const favorite = await browser.bookmarks.create({
      parentId: ctx.ids.favoritesId,
      index,
      title: tab.title || url,
      url,
    });
    // Bind first so reconcile sees an adopted favorite, not a stray native pin.
    await setBinding(ctx, tabId, { kind: 'favorite', id: favorite.id });
    await retry(() => browser.tabs.update(tabId, { pinned: true }));
    return favorite.id;
  },

  async removeFavorite({ windowId, favoriteId }) {
    await deleteBookmark({ type: 'deleteBookmark', windowId, id: favoriteId });
  },
} satisfies Partial<Handlers>;
