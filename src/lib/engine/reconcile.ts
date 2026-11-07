import { browser } from 'wxt/browser';
import { groupColorFor } from './colors';
import {
  type Context,
  activeSpaceOf,
  boundIdsInWindow,
  findSpace,
  groupSpaceOf,
  hueOf,
  liveBinding,
  loadContext,
  spaceOfTab,
  spaceTabs,
} from './context';
import { collapseOtherSpaces, groupTabs } from './groups';
import { prunePages } from './last-pages';
import { ownerOf } from './owner';
import { retry } from './retry';
import { parkedTab, setActiveSpace, setBinding, setGroupSpace } from './session';
import {
  type BookmarkNode,
  NO_GROUP,
  bookmarkIds,
  favoritesFolder,
  isPin,
  pinsIn,
  spaceOfBookmark,
  tabUrl,
} from './snapshot';
import { newSpaceName } from './space-names';
import { lastPagesItem } from './storage';
import { rememberAutoTitles } from './titles';

/**
 * Bring one window in line with the model. Idempotent: running it twice changes
 * nothing, so it is safe to trigger from any Chrome event.
 */
export async function reconcile(windowId: number, options: { recover?: boolean } = {}): Promise<void> {
  const window = await browser.windows.get(windowId).catch(() => undefined);
  if (window?.type !== 'normal') return;
  const ctx = await loadContext(windowId);
  const lastPages = await lastPagesItem.getValue();
  await mapGroupsToSpaces(ctx);
  await syncFavorites(ctx, lastPages);
  if (options.recover) {
    await recoverPins(ctx, lastPages);
    await prunePages(bookmarkIds(ctx.root));
  }
  const activeSpace = await followActiveTab(ctx);
  await adoptLooseTabs(ctx, activeSpace);
}

/** Every tab group is a Space. Groups made in Chrome's own UI become new Spaces. */
async function mapGroupsToSpaces(ctx: Context): Promise<void> {
  for (const group of ctx.groups) {
    const mapped = groupSpaceOf(ctx, group.id);
    let space = mapped === undefined ? undefined : findSpace(ctx, mapped);
    if (!space) {
      const title = newSpaceName(
        group.title,
        ctx.spaces.map((s) => s.title),
      );
      const folder = await browser.bookmarks.create({ parentId: ctx.ids.rootId, title });
      space = { id: folder.id, title, children: [] };
      ctx.spaces.push(space);
    }
    await setGroupSpace(ctx, group.id, space.id);
    // One-way: the Space's name and color win over edits made in the tab strip.
    const title = space.title;
    const color = groupColorFor(hueOf(ctx, space.id));
    if (group.title !== title || group.color !== color) {
      await retry(() => browser.tabGroups.update(group.id, { title, color }));
    }
  }
}

/**
 * Favorites are Chrome's native pinned tabs: adopt new native pins, release unpinned ones. A pinned tab Volet has
 * forgotten (after a restart or a reload) finds its favorite again, even if it left the favorite's page.
 */
async function syncFavorites(ctx: Context, lastPages: Record<string, string>): Promise<void> {
  const liveIds = bookmarkIds(ctx.root);
  const favorites = (favoritesFolder(ctx.root, ctx.ids.favoritesId)?.children ?? []).filter(isPin);
  for (const tab of ctx.tabs) {
    if (tab.id === undefined) continue;
    const binding = ctx.bindings[tab.id];
    const live = binding && liveIds.has(binding.id) ? binding : undefined;
    if (binding && !live) await setBinding(ctx, tab.id, undefined);

    if (tab.pinned && live?.kind !== 'favorite') {
      const url = tabUrl(tab);
      if (!url) continue;
      let favorite: BookmarkNode | undefined = ownerOf(favorites, url, lastPages, boundIdsInWindow(ctx));
      if (!favorite) {
        favorite = await browser.bookmarks.create({ parentId: ctx.ids.favoritesId, title: tab.title || url, url });
        await rememberAutoTitles([favorite]);
      }
      await setBinding(ctx, tab.id, { kind: 'favorite', id: favorite.id });
    } else if (!tab.pinned && live?.kind === 'favorite') {
      await setBinding(ctx, tab.id, undefined);
    }
  }
}

/** After a restart, tabs restored by Chrome have new ids: re-attach them to their pins by URL (see `ownerOf`). */
async function recoverPins(ctx: Context, lastPages: Record<string, string>): Promise<void> {
  for (const space of ctx.spaces) {
    const pins = pinsIn(space);
    for (const tab of spaceTabs(ctx, space.id)) {
      const url = tabUrl(tab);
      if (tab.id === undefined || liveBinding(ctx, tab.id) || !url) continue;
      const pin = ownerOf(pins, url, lastPages, boundIdsInWindow(ctx));
      if (pin) await setBinding(ctx, tab.id, { kind: 'pin', id: pin.id });
    }
  }
}

/**
 * The sidebar follows the active tab when it lives in another Space, unless that tab was left in
 * front of the Space shown (parked, see `switchSpace`). Returns the active Space.
 */
async function followActiveTab(ctx: Context): Promise<string> {
  let activeSpace = activeSpaceOf(ctx);
  const activeTab = ctx.tabs.find((tab) => tab.active);
  const tabSpace = activeTab ? spaceOfTab(ctx, activeTab) : undefined;
  const parked = activeTab?.id !== undefined && activeTab.id === (await parkedTab(ctx.windowId));
  if (tabSpace && tabSpace !== activeSpace && !parked) {
    activeSpace = tabSpace;
    await collapseOtherSpaces(ctx, activeSpace);
  }
  await setActiveSpace(ctx, activeSpace);
  return activeSpace;
}

/** Loose tabs (Cmd+T, moved from another window...) join a Space's group. */
async function adoptLooseTabs(ctx: Context, activeSpace: string): Promise<void> {
  const loose = new Map<string, number[]>();
  for (const tab of ctx.tabs) {
    if (tab.id === undefined || tab.pinned || tab.groupId !== NO_GROUP) continue;
    const binding = liveBinding(ctx, tab.id);
    const target = (binding?.kind === 'pin' && spaceOfBookmark(ctx.root, binding.id)) || activeSpace;
    loose.set(target, [...(loose.get(target) ?? []), tab.id]);
  }
  for (const [spaceId, tabIds] of loose) await groupTabs(ctx, spaceId, tabIds);
}
