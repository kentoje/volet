import { browser } from 'wxt/browser';
import { sameUrl } from '../model/url';
import { groupColorFor } from './colors';
import {
  type Context,
  activeSpaceOf,
  boundIdsInWindow,
  hueOf,
  liveBinding,
  loadContext,
  spaceOfTab,
  spaceTabs,
  tabUrl,
} from './context';
import { collapseOtherSpaces, groupTabs } from './groups';
import { retry } from './retry';
import { setActiveSpace, setBinding, setGroupSpace } from './session';
import { NO_GROUP, bookmarkIds, findBookmark, pinsIn, spaceOfBookmark, spaceOfGroup } from './snapshot';
import { uniqueName } from './space-names';

/**
 * Bring one window in line with the model. Idempotent: running it twice changes
 * nothing, so it is safe to trigger from any Chrome event.
 */
export async function reconcile(windowId: number, options: { recover?: boolean } = {}): Promise<void> {
  const window = await browser.windows.get(windowId).catch(() => undefined);
  if (window?.type !== 'normal') return;
  const ctx = await loadContext(windowId);
  await mapGroupsToSpaces(ctx);
  await syncFavorites(ctx);
  if (options.recover) await recoverPins(ctx);
  const activeSpace = await followActiveTab(ctx);
  await adoptLooseTabs(ctx, activeSpace);
}

/** Every tab group is a Space. Groups made in Chrome's own UI become new Spaces. */
async function mapGroupsToSpaces(ctx: Context): Promise<void> {
  for (const group of ctx.groups) {
    let spaceId = spaceOfGroup(group.id, ctx.groups, ctx.groupSpaces, ctx.spaces);
    if (spaceId === undefined) {
      const title = uniqueName(
        group.title?.trim() || `Space ${ctx.spaces.length + 1}`,
        ctx.spaces.map((space) => space.title),
      );
      const folder = await browser.bookmarks.create({ parentId: ctx.ids.rootId, title });
      ctx.spaces.push({ id: folder.id, title, children: [] });
      spaceId = folder.id;
    }
    await setGroupSpace(ctx, group.id, spaceId);
    // One-way: the Space's name and color win over edits made in the tab strip.
    const title = ctx.spaces.find((space) => space.id === spaceId)!.title;
    const color = groupColorFor(hueOf(ctx, spaceId));
    if (group.title !== title || group.color !== color) {
      await retry(() => browser.tabGroups.update(group.id, { title, color }));
    }
  }
}

/** Favorites are Chrome's native pinned tabs: adopt new native pins, release unpinned ones. */
async function syncFavorites(ctx: Context): Promise<void> {
  const liveIds = bookmarkIds(ctx.root);
  const favorites = (findBookmark(ctx.root, ctx.ids.favoritesId)?.children ?? []).filter((node) => node.url);
  for (const tab of ctx.tabs) {
    if (tab.id === undefined) continue;
    const binding = ctx.bindings[tab.id];
    const live = binding && liveIds.has(binding.id) ? binding : undefined;
    if (binding && !live) await setBinding(ctx, tab.id, undefined);

    if (tab.pinned && live?.kind !== 'favorite') {
      const url = tabUrl(tab);
      if (!url) continue;
      const taken = boundIdsInWindow(ctx);
      const favorite =
        favorites.find((fav) => !taken.has(fav.id) && sameUrl(fav.url!, url)) ??
        (await browser.bookmarks.create({ parentId: ctx.ids.favoritesId, title: tab.title || url, url }));
      await setBinding(ctx, tab.id, { kind: 'favorite', id: favorite.id });
    } else if (!tab.pinned && live?.kind === 'favorite') {
      await setBinding(ctx, tab.id, undefined);
    }
  }
}

/** After a restart, tabs restored by Chrome have new ids: re-attach them to their pins by URL. */
async function recoverPins(ctx: Context): Promise<void> {
  for (const space of ctx.spaces) {
    const pins = pinsIn(space);
    for (const tab of spaceTabs(ctx, space.id)) {
      const url = tabUrl(tab);
      if (tab.id === undefined || liveBinding(ctx, tab.id) || !url) continue;
      const taken = boundIdsInWindow(ctx);
      const pin = pins.find((p) => !taken.has(p.id) && sameUrl(p.url!, url));
      if (pin) await setBinding(ctx, tab.id, { kind: 'pin', id: pin.id });
    }
  }
}

/** The sidebar follows the active tab when it lives in another Space. Returns the active Space. */
async function followActiveTab(ctx: Context): Promise<string> {
  let activeSpace = activeSpaceOf(ctx);
  const activeTab = ctx.tabs.find((tab) => tab.active);
  const tabSpace = activeTab ? spaceOfTab(ctx, activeTab) : undefined;
  if (tabSpace && tabSpace !== activeSpace) {
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
