import { browser } from 'wxt/browser';
import type { Snapshot } from '@/lib/engine/snapshot';
import {
  activeSpacesItem,
  bindingsItem,
  collapsedItem,
  groupSpacesItem,
  rootItem,
  spaceMetaItem,
} from '@/lib/engine/storage';

/** Read everything one window's sidebar needs, straight from Chrome. */
export async function loadSnapshot(windowId: number): Promise<Snapshot> {
  const ids = await rootItem.getValue();
  const [tabs, groups, subtree, bindings, groupSpaces, activeSpaces, spaceMeta, collapsed] = await Promise.all([
    browser.tabs.query({ windowId }),
    browser.tabGroups.query({ windowId }),
    ids ? browser.bookmarks.getSubTree(ids.rootId).catch(() => []) : Promise.resolve([]),
    bindingsItem.getValue(),
    groupSpacesItem.getValue(),
    activeSpacesItem.getValue(),
    spaceMetaItem.getValue(),
    collapsedItem.getValue(),
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
    collapsed,
  };
}
