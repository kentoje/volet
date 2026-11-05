import { browser, type Browser } from 'wxt/browser';
import { defaultHue } from './colors';
import { ensureRoot } from './root';
import { type BookmarkNode, findBookmark, spaceFolders, spaceOfBookmark, spaceOfGroup } from './snapshot';
import {
  type Binding,
  type RootIds,
  type SpaceMeta,
  activeSpacesItem,
  bindingsItem,
  groupSpacesItem,
  spaceMetaItem,
} from './storage';

export type Tab = Browser.tabs.Tab;
export type Group = Browser.tabGroups.TabGroup;

/** Key under activeSpaces remembering the last Space used in any window (for new windows). */
export const LAST_SPACE_KEY = 'last';

/** Chrome state for one window, loaded fresh at the start of each engine task. */
export interface Context {
  windowId: number;
  ids: RootIds;
  tabs: Tab[];
  groups: Group[];
  root: BookmarkNode;
  spaces: BookmarkNode[];
  bindings: Record<string, Binding>;
  groupSpaces: Record<string, string>;
  activeSpaces: Record<string, string>;
  spaceMeta: Record<string, SpaceMeta>;
}

export async function loadContext(windowId: number): Promise<Context> {
  const ids = await ensureRoot();
  const [tabs, groups, subtree, bindings, groupSpaces, activeSpaces, spaceMeta] = await Promise.all([
    browser.tabs.query({ windowId }),
    browser.tabGroups.query({ windowId }),
    browser.bookmarks.getSubTree(ids.rootId),
    bindingsItem.getValue(),
    groupSpacesItem.getValue(),
    activeSpacesItem.getValue(),
    spaceMetaItem.getValue(),
  ]);
  const root = subtree[0]!;
  return {
    windowId,
    ids,
    tabs: tabs.sort((a, b) => a.index - b.index),
    groups,
    root,
    spaces: spaceFolders(root, ids.favoritesId),
    bindings,
    groupSpaces,
    activeSpaces,
    spaceMeta,
  };
}

export async function reloadRoot(ctx: Context): Promise<void> {
  ctx.root = (await browser.bookmarks.getSubTree(ctx.ids.rootId))[0]!;
  ctx.spaces = spaceFolders(ctx.root, ctx.ids.favoritesId);
}

export async function reloadTabs(ctx: Context): Promise<void> {
  ctx.tabs = (await browser.tabs.query({ windowId: ctx.windowId })).sort((a, b) => a.index - b.index);
}

/** A tab's URL. Chrome leaves `url` empty until the first navigation commits. */
export function tabUrl(tab: Tab): string | undefined {
  return tab.url || tab.pendingUrl || undefined;
}

export function hueOf(ctx: Context, spaceId: string): number {
  const index = ctx.spaces.findIndex((space) => space.id === spaceId);
  const space = ctx.spaces[index];
  return (space && ctx.spaceMeta[space.title]?.hue) ?? defaultHue(Math.max(0, index));
}

/** The tab's binding, if the pin or favorite it points to still exists. */
export function liveBinding(ctx: Context, tabId: number | undefined): Binding | undefined {
  if (tabId === undefined) return undefined;
  const binding = ctx.bindings[tabId];
  return binding && findBookmark(ctx.root, binding.id) ? binding : undefined;
}

/** Which Space a tab belongs to: its pin's Space, else its group's. Favorites belong to none. */
export function spaceOfTab(ctx: Context, tab: Tab): string | undefined {
  const binding = liveBinding(ctx, tab.id);
  if (binding?.kind === 'favorite' || tab.pinned) return undefined;
  if (binding?.kind === 'pin') return spaceOfBookmark(ctx.root, binding.id);
  return spaceOfGroup(tab.groupId, ctx.groups, ctx.groupSpaces, ctx.spaces);
}

export function activeSpaceOf(ctx: Context): string {
  const known = (id: string | undefined): id is string =>
    id !== undefined && ctx.spaces.some((space) => space.id === id);
  const saved = ctx.activeSpaces[ctx.windowId];
  if (known(saved)) return saved;
  const activeTab = ctx.tabs.find((tab) => tab.active);
  const fromTab = activeTab ? spaceOfTab(ctx, activeTab) : undefined;
  if (known(fromTab)) return fromTab;
  const last = ctx.activeSpaces[LAST_SPACE_KEY];
  if (known(last)) return last;
  return ctx.spaces[0]!.id;
}

/** The Space's tab group in this window, if it has one. */
export function groupOf(ctx: Context, spaceId: string): number | undefined {
  return ctx.groups.find((group) => spaceOfGroup(group.id, ctx.groups, ctx.groupSpaces, ctx.spaces) === spaceId)?.id;
}

/** Tabs that make up a Space in this window (temporary and pinned), in strip order. */
export function spaceTabs(ctx: Context, spaceId: string): Tab[] {
  return ctx.tabs.filter((tab) => spaceOfTab(ctx, tab) === spaceId);
}

export function temporaryTabs(ctx: Context, spaceId: string): Tab[] {
  return spaceTabs(ctx, spaceId).filter((tab) => !liveBinding(ctx, tab.id));
}

/** The tab bound to a bookmark in this window. */
export function boundTab(ctx: Context, bookmarkId: string): Tab | undefined {
  return ctx.tabs.find((tab) => tab.id !== undefined && ctx.bindings[tab.id]?.id === bookmarkId);
}

/** Tabs bound to a bookmark, across all windows. */
export function boundTabIds(ctx: Context, bookmarkId: string): number[] {
  return Object.entries(ctx.bindings)
    .filter(([, binding]) => binding.id === bookmarkId)
    .map(([tabId]) => Number(tabId));
}

/** Bookmark ids already bound to a tab in this window. */
export function boundIdsInWindow(ctx: Context): Set<string> {
  const ids = new Set<string>();
  for (const tab of ctx.tabs) {
    const binding = tab.id !== undefined ? ctx.bindings[tab.id] : undefined;
    if (binding) ids.add(binding.id);
  }
  return ids;
}

export function findSpace(ctx: Context, spaceId: string): BookmarkNode | undefined {
  return ctx.spaces.find((space) => space.id === spaceId);
}
