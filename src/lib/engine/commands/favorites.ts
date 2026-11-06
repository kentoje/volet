import { browser } from 'wxt/browser';
import { type Context, boundTab, boundTabIds, loadContext, tabUrl } from '../context';
import { ensureRoot } from '../root';
import { retry } from '../retry';
import { setBinding } from '../session';
import { findBookmark } from '../snapshot';
import { rememberAutoTitles } from '../titles';
import { deleteBookmark, moveBookmark } from './bookmarks';
import type { CommandOf, Handlers } from './types';

/** Move a pin's bookmark into Favorites; its open tabs become the favorite's (Chrome-pinned) tabs. */
async function favoritePin(ctx: Context, { pinId, index }: Omit<CommandOf<'favoritePin'>, 'type' | 'windowId'>) {
  await browser.bookmarks.move(pinId, { parentId: ctx.ids.favoritesId, index });
  for (const tabId of boundTabIds(ctx, pinId)) {
    await setBinding(ctx, tabId, { kind: 'favorite', id: pinId });
    await retry(() => browser.tabs.update(tabId, { pinned: true })).catch(() => undefined); // may be closed
  }
  return pinId;
}

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
    // A pin's tab: the pin itself becomes the favorite (it isn't left behind in the Space).
    const binding = ctx.bindings[tabId];
    if (binding?.kind === 'pin') return favoritePin(ctx, { pinId: binding.id, index });
    const tab = ctx.tabs.find((t) => t.id === tabId);
    const url = tab && tabUrl(tab);
    if (!tab || !url) return;
    const favorite = await browser.bookmarks.create({
      parentId: ctx.ids.favoritesId,
      index,
      title: tab.title || url,
      url,
    });
    await rememberAutoTitles([favorite]);
    // Bind first so reconcile sees an adopted favorite, not a stray native pin.
    await setBinding(ctx, tabId, { kind: 'favorite', id: favorite.id });
    await retry(() => browser.tabs.update(tabId, { pinned: true }));
    return favorite.id;
  },

  async favoritePin({ windowId, pinId, index }) {
    return favoritePin(await loadContext(windowId), { pinId, index });
  },

  async moveFavorite({ favoriteId, index }) {
    const { favoritesId } = await ensureRoot();
    await moveBookmark({ type: 'moveBookmark', id: favoriteId, parentId: favoritesId, index });
  },

  async removeFavorite({ windowId, favoriteId }) {
    await deleteBookmark({ type: 'deleteBookmark', windowId, id: favoriteId });
  },
} satisfies Partial<Handlers>;
