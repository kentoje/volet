import { browser } from 'wxt/browser';
import { boundTab, boundTabIds, loadContext, tabUrl } from '../context';
import { groupTabs } from '../groups';
import { retry } from '../retry';
import { ensureRoot } from '../root';
import { setBinding } from '../session';
import { findBookmark, pinsIn, spaceOfBookmark } from '../snapshot';
import { bindingsItem } from '../storage';
import { hasAutoTitle, refreshBoundTitle } from '../titles';
import type { CommandOf, Handlers } from './types';

/** Move a pin, folder, favorite or Space. `index` is the final position among its new siblings. */
export async function moveBookmark({ id, parentId, index }: CommandOf<'moveBookmark'>): Promise<void> {
  const [node] = await browser.bookmarks.get(id);
  if (!node) return;
  // Chrome counts the target index before removing the node from its old position.
  const adjusted =
    index !== undefined && node.parentId === parentId && (node.index ?? 0) < index ? index + 1 : index;
  await browser.bookmarks.move(id, { parentId, index: adjusted });
  await regroupBoundTabs(id);
}

/** Delete a pin, folder or favorite. Open tabs bound to it stay open as temporary tabs. */
export async function deleteBookmark({ windowId, id }: CommandOf<'deleteBookmark'>): Promise<void> {
  const ctx = await loadContext(windowId);
  const node = findBookmark(ctx.root, id);
  if (!node || node.id === ctx.ids.rootId || node.id === ctx.ids.favoritesId) return;
  const ids = node.url !== undefined ? [node.id] : pinsIn(node).map((pin) => pin.id);
  for (const bookmarkId of ids) {
    for (const tabId of boundTabIds(ctx, bookmarkId)) {
      if (ctx.bindings[tabId]?.kind === 'favorite') {
        // Favorites live in Chrome's pinned area; unpinning hands them back to a Space.
        await retry(() => browser.tabs.update(tabId, { pinned: false })).catch(() => undefined);
      }
      await setBinding(ctx, tabId, undefined);
    }
  }
  if (node.url !== undefined) await browser.bookmarks.remove(node.id);
  else await browser.bookmarks.removeTree(node.id);
}

/** After a pin or folder moves to another Space, move its open tabs into that Space's group. */
async function regroupBoundTabs(bookmarkId: string): Promise<void> {
  const ids = await ensureRoot();
  const root = (await browser.bookmarks.getSubTree(ids.rootId))[0]!;
  const moved = findBookmark(root, bookmarkId);
  const spaceId = spaceOfBookmark(root, bookmarkId);
  if (!moved || !spaceId) return;
  const pinIds = new Set(moved.url !== undefined ? [moved.id] : pinsIn(moved).map((pin) => pin.id));
  const byWindow = new Map<number, number[]>();
  for (const [tabId, binding] of Object.entries(await bindingsItem.getValue())) {
    if (binding.kind !== 'pin' || !pinIds.has(binding.id)) continue;
    const tab = await browser.tabs.get(Number(tabId)).catch(() => undefined);
    if (tab?.id !== undefined) byWindow.set(tab.windowId, [...(byWindow.get(tab.windowId) ?? []), tab.id]);
  }
  for (const [windowId, tabIds] of byWindow) await groupTabs(await loadContext(windowId), spaceId, tabIds);
}

export const bookmarkHandlers = {
  moveBookmark,
  deleteBookmark,

  /** Make the page a pin's or favorite's tab is on its new home (Arc's "Replace pinned URL with current"). */
  async setHome({ windowId, id }) {
    const ctx = await loadContext(windowId);
    const bound = boundTab(ctx, id);
    const url = bound && tabUrl(bound);
    const [before] = await browser.bookmarks.get(id).catch(() => []);
    if (!url || bound.id === undefined || !before?.url) return;
    const followsPage = await hasAutoTitle(before);
    await browser.bookmarks.update(id, { url });
    // It takes the new page's title, unless someone named it (then the name stays).
    if (followsPage) await refreshBoundTitle(bound.id);
  },

  /** A renamed pin or favorite keeps its name: its title no longer follows the page (titles.ts). */
  async renameBookmark({ id, title }) {
    await browser.bookmarks.update(id, { title });
  },
} satisfies Partial<Handlers>;
