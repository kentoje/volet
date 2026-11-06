import { browser } from 'wxt/browser';
import type { Snapshot } from '@/lib/engine/snapshot';
import {
  activeSpacesItem,
  autoTitlesItem,
  bindingsItem,
  groupSpacesItem,
  openFoldersItem,
  rootItem,
  spaceMetaItem,
} from '@/lib/engine/storage';

/** The storage items a snapshot reads (`area:key`): changes to any other item don't concern the sidebar. */
const SNAPSHOT_KEYS: ReadonlySet<string> = new Set(
  [rootItem, bindingsItem, groupSpacesItem, activeSpacesItem, spaceMetaItem, openFoldersItem, autoTitlesItem].map(
    (item) => item.key,
  ),
);

/** Whether a `storage.onChanged` event changed something a snapshot reads. */
export function changesSnapshot(changes: Record<string, unknown>, area: string): boolean {
  return Object.keys(changes).some((key) => SNAPSHOT_KEYS.has(`${area}:${key}`));
}

/** Read everything one window's sidebar needs, straight from Chrome. */
export async function loadSnapshot(windowId: number): Promise<Snapshot> {
  const [[ids, subtree], tabs, groups, bindings, groupSpaces, activeSpaces, spaceMeta, openFolders, autoTitles] =
    await Promise.all([
    rootItem
      .getValue()
      .then(async (ids) => [ids, ids ? await browser.bookmarks.getSubTree(ids.rootId).catch(() => []) : []] as const),
    browser.tabs.query({ windowId }),
    browser.tabGroups.query({ windowId }),
    bindingsItem.getValue(),
    groupSpacesItem.getValue(),
    activeSpacesItem.getValue(),
    spaceMetaItem.getValue(),
    openFoldersItem.getValue(),
    autoTitlesItem.getValue(),
  ]);
  return {
    windowId,
    tabs: tabs.sort((a, b) => a.index - b.index),
    groups,
    root: subtree[0],
    favoritesId: ids?.favoritesId,
    bindings,
    groupSpaces,
    activeSpaces,
    spaceMeta,
    openFolders,
    autoTitles,
  };
}
