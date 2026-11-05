import type { Favorite, LiveTab, PinnedNode, Space, SpaceId, TabId } from '../model/types';
import { defaultHue } from './colors';
import {
  type BookmarkNode,
  type Snapshot,
  type TabInfo,
  bookmarkIds,
  favoritesFolder,
  spaceFolders,
  spaceOfGroup,
} from './snapshot';

export interface SidebarState {
  spaces: Space[];
  favorites: Favorite[];
  tabs: Map<TabId, LiveTab>;
  activeSpaceId: SpaceId;
  activeTabId: TabId | undefined;
  collapsedFolders: Set<string>;
}

/** State before anything has loaded. Its collections are never mutated (state is replaced, not edited). */
export const EMPTY_STATE: Readonly<SidebarState> = Object.freeze({
  spaces: [],
  favorites: [],
  tabs: new Map(),
  activeSpaceId: '',
  activeTabId: undefined,
  collapsedFolders: new Set<string>(),
});

export function toLiveTab(tab: TabInfo & { id: number }): LiveTab {
  const url = tab.url || tab.pendingUrl || '';
  return {
    id: tab.id,
    title: tab.title || url || 'New Tab',
    url,
    status: tab.status === 'loading' ? 'loading' : 'complete',
    audible: tab.audible,
    muted: tab.mutedInfo?.muted,
  };
}

/** Compute what one window's sidebar shows from Chrome's state. Pure: no Chrome calls. */
export function derive(snapshot: Snapshot): SidebarState {
  const folders = spaceFolders(snapshot.root, snapshot.favoritesId);
  const liveIds = bookmarkIds(snapshot.root);

  const tabs = new Map<TabId, LiveTab>();
  /** bookmark id → the tab bound to it in this window */
  const boundTabs = new Map<string, TabId>();
  for (const tab of snapshot.tabs) {
    if (tab.id === undefined) continue;
    tabs.set(tab.id, toLiveTab({ ...tab, id: tab.id }));
    const binding = snapshot.bindings[tab.id];
    if (binding && liveIds.has(binding.id) && !boundTabs.has(binding.id)) boundTabs.set(binding.id, tab.id);
  }
  const isBound = (tabId: TabId) => {
    const binding = snapshot.bindings[tabId];
    return binding !== undefined && boundTabs.get(binding.id) === tabId;
  };

  const spaces: Space[] = folders.map((folder, index) => ({
    id: folder.id,
    name: folder.title,
    hue: snapshot.spaceMeta[folder.title]?.hue ?? defaultHue(index),
    pinned: toPinnedNodes(folder.children ?? [], boundTabs),
    tabIds: [],
  }));

  const activeTab = snapshot.tabs.find((tab) => tab.active);
  const groupSpace = (groupId: number) => spaceOfGroup(groupId, snapshot.groups, snapshot.groupSpaces, folders);
  const known = (id: string | undefined) => id !== undefined && spaces.some((space) => space.id === id);

  let activeSpaceId = snapshot.activeSpaces[snapshot.windowId];
  if (!known(activeSpaceId)) {
    const fromTab = activeTab ? groupSpace(activeTab.groupId) : undefined;
    activeSpaceId = known(fromTab) ? fromTab : spaces[0]?.id;
  }

  for (const tab of snapshot.tabs) {
    if (tab.id === undefined || isBound(tab.id)) continue;
    // A natively pinned tab that isn't a favorite yet: the engine is about to make it one.
    if (tab.pinned) continue;
    // Ungrouped tabs are about to join the active Space; show them there already.
    const spaceId = groupSpace(tab.groupId) ?? activeSpaceId;
    spaces.find((space) => space.id === spaceId)?.tabIds.push(tab.id);
  }

  const favorites: Favorite[] = (favoritesFolder(snapshot.root, snapshot.favoritesId)?.children ?? [])
    .filter((node) => node.url !== undefined)
    .map((node) => ({ id: node.id, title: node.title, url: node.url!, tabId: boundTabs.get(node.id) }));

  return {
    spaces,
    favorites,
    tabs,
    activeSpaceId: activeSpaceId ?? '',
    activeTabId: activeTab?.id,
    collapsedFolders: new Set(snapshot.collapsed),
  };
}

function toPinnedNodes(nodes: BookmarkNode[], boundTabs: Map<string, TabId>): PinnedNode[] {
  return nodes.map((node) =>
    node.url !== undefined
      ? { kind: 'pin', id: node.id, title: node.title, url: node.url, tabId: boundTabs.get(node.id) }
      : { kind: 'folder', id: node.id, title: node.title, children: toPinnedNodes(node.children ?? [], boundTabs) },
  );
}
