import { browser, type Browser } from 'wxt/browser';
import { type Context, activeSpaceOf, findSpace, hueOf, liveBinding, loadContext, spaceOfTab } from '../context';
import { favoritesFolder, spaceOfGroup, tabUrl } from '../snapshot';
import { archiveItem } from '../storage';
import { type CandidateInput, candidates } from './candidates';
import { asUrl, rank } from './rank';
import type { PaletteItem, PaletteResults } from './types';

const EMPTY_QUERY_ARCHIVE = 5;

/** Palette results for a window and a query. */
export async function searchPalette(windowId: number, text: string): Promise<PaletteResults> {
  const [ctx, allTabs, allGroups, archive] = await Promise.all([
    loadContext(windowId),
    browser.tabs.query({}),
    browser.tabGroups.query({}),
    archiveItem.getValue(),
  ]);
  const activeSpaceId = activeSpaceOf(ctx);

  const all = candidates({
    tabs: paletteTabs(ctx, activeSpaceId, allTabs, allGroups),
    spaces: ctx.spaces.map((space) => ({ id: space.id, title: space.title, hue: hueOf(ctx, space.id), node: space })),
    activeSpaceId,
    favoritesFolder: favoritesFolder(ctx.root, ctx.ids.favoritesId),
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

/**
 * Every window's tabs as the palette lists them: the window's own first, its active Space's
 * first among them. The extension's own pages are left out.
 */
function paletteTabs(
  ctx: Context,
  activeSpaceId: string,
  allTabs: Browser.tabs.Tab[],
  allGroups: Browser.tabGroups.TabGroup[],
): CandidateInput['tabs'] {
  const ownOrigin = browser.runtime.getURL('');
  return allTabs
    .flatMap((tab) => {
      const url = tabUrl(tab);
      if (tab.id === undefined || (url ?? '').startsWith(ownOrigin)) return [];
      const here = tab.windowId === ctx.windowId;
      const spaceId = here ? spaceOfTab(ctx, tab) : spaceOfGroup(tab.groupId, allGroups, ctx.groupSpaces, ctx.spaces);
      return [
        {
          id: tab.id,
          title: tab.title || url || 'New Tab',
          url: url ?? '',
          icon: tab.favIconUrl,
          spaceName: spaceId === undefined ? undefined : findSpace(ctx, spaceId)?.title,
          boundTo: liveBinding(ctx, tab.id)?.id,
          order: (here ? 0 : 2) + (spaceId === activeSpaceId ? 0 : 1),
        },
      ];
    })
    .sort((a, b) => a.order - b.order);
}
