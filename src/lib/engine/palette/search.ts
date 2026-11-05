import { browser } from 'wxt/browser';
import { activeSpaceOf, hueOf, loadContext, spaceOfTab, tabUrl } from '../context';
import { findBookmark, spaceOfGroup } from '../snapshot';
import { archiveItem } from '../storage';
import { candidates, isSaved } from './candidates';
import { asUrl, rank } from './rank';
import type { PaletteItem, PaletteResults } from './types';

const EMPTY_QUERY_ARCHIVE = 5;

/** Palette results for a window and a query. */
export async function searchPalette(windowId: number, text: string): Promise<PaletteResults> {
  const ctx = await loadContext(windowId);
  const activeSpaceId = activeSpaceOf(ctx);
  const ownOrigin = browser.runtime.getURL('');
  const [allTabs, allGroups, archive] = await Promise.all([
    browser.tabs.query({}),
    browser.tabGroups.query({}),
    archiveItem.getValue(),
  ]);

  const spaceTitle = (id: string | undefined) => ctx.spaces.find((space) => space.id === id)?.title;
  const tabs = allTabs
    .filter((tab) => tab.id !== undefined && !(tabUrl(tab) ?? '').startsWith(ownOrigin))
    .map((tab) => {
      const binding = ctx.bindings[tab.id!];
      const spaceId =
        tab.windowId === windowId
          ? spaceOfTab(ctx, tab)
          : spaceOfGroup(tab.groupId, allGroups, ctx.groupSpaces, ctx.spaces);
      return {
        id: tab.id!,
        title: tab.title || tabUrl(tab) || 'New Tab',
        url: tabUrl(tab) ?? '',
        spaceName: spaceTitle(spaceId),
        boundTo: isSaved(ctx.root, binding?.id) ? binding!.id : undefined,
        order: (tab.windowId === windowId ? 0 : 2) + (spaceId === activeSpaceId ? 0 : 1),
      };
    })
    .sort((a, b) => a.order - b.order);

  const all = candidates({
    tabs,
    spaces: ctx.spaces.map((space) => ({ id: space.id, title: space.title, hue: hueOf(ctx, space.id), node: space })),
    activeSpaceId,
    favoritesFolder: findBookmark(ctx.root, ctx.ids.favoritesId),
    archive: text.trim() ? archive : archive.slice(0, EMPTY_QUERY_ARCHIVE),
  });

  const items: PaletteItem[] = rank(text, all);
  const query = text.trim();
  if (query) {
    const url = asUrl(query);
    if (url) items.unshift({ id: 'open-url', kind: 'open-url', title: `Open ${url}`, url, ref: url });
    items.push({ id: 'search', kind: 'search', title: `Search for “${query}”`, ref: query });
  }
  return { items, hue: hueOf(ctx, activeSpaceId) };
}
