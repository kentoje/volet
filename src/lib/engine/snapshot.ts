import type { Binding, SpaceMeta } from './schema';

/** The parts of chrome.tabs.Tab the engine reads (kept minimal so tests can build them). */
export interface TabInfo {
  id?: number;
  windowId: number;
  index: number;
  title?: string;
  url?: string;
  pendingUrl?: string;
  favIconUrl?: string;
  status?: string;
  active: boolean;
  pinned: boolean;
  groupId: number;
  audible?: boolean;
  mutedInfo?: { muted: boolean };
}

export interface GroupInfo {
  id: number;
  windowId: number;
  title?: string;
  color: string;
  collapsed: boolean;
}

export interface BookmarkNode {
  id: string;
  parentId?: string;
  index?: number;
  title: string;
  url?: string;
  children?: BookmarkNode[];
}

/** Everything needed to compute what one window's sidebar shows. */
export interface Snapshot {
  windowId: number;
  /** Tabs of this window, in tab strip order. */
  tabs: TabInfo[];
  groups: GroupInfo[];
  /** The root "Spaces" bookmark folder, with its whole subtree. */
  root: BookmarkNode | undefined;
  favoritesId: string | undefined;
  bindings: Record<string, Binding>;
  groupSpaces: Record<string, string>;
  activeSpaces: Record<string, string>;
  spaceMeta: Record<string, SpaceMeta>;
  collapsed: string[];
}

export const NO_GROUP = -1;

/** Space folders: every folder in the root except Favorites, in bookmark order. */
export function spaceFolders(root: BookmarkNode | undefined, favoritesId: string | undefined): BookmarkNode[] {
  return (root?.children ?? []).filter((node) => node.url === undefined && node.id !== favoritesId);
}

export function favoritesFolder(root: BookmarkNode | undefined, favoritesId: string | undefined) {
  return root?.children?.find((node) => node.id === favoritesId);
}

/** Every bookmark id under the root, to tell live bindings from stale ones. */
export function bookmarkIds(root: BookmarkNode | undefined): Set<string> {
  const ids = new Set<string>();
  const visit = (node: BookmarkNode) => {
    ids.add(node.id);
    node.children?.forEach(visit);
  };
  if (root) visit(root);
  return ids;
}

export function findBookmark(root: BookmarkNode | undefined, id: string): BookmarkNode | undefined {
  if (!root) return undefined;
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findBookmark(child, id);
    if (found) return found;
  }
  return undefined;
}

/** The Space folder (direct child of the root) that contains a bookmark. */
export function spaceOfBookmark(root: BookmarkNode | undefined, id: string): string | undefined {
  for (const space of root?.children ?? []) {
    if (space.url === undefined && findBookmark(space, id)) return space.id;
  }
  return undefined;
}

/** All pins (bookmarks with a URL) inside a folder, depth-first. */
export function pinsIn(folder: BookmarkNode | undefined): BookmarkNode[] {
  if (!folder) return [];
  return (folder.children ?? []).flatMap((node) => (node.url !== undefined ? [node] : pinsIn(node)));
}

/** Which Space a tab group belongs to: its recorded mapping, else a Space with the same name. */
export function spaceOfGroup(
  groupId: number,
  groups: GroupInfo[],
  groupSpaces: Record<string, string>,
  spaces: BookmarkNode[],
): string | undefined {
  if (groupId === NO_GROUP) return undefined;
  const mapped = groupSpaces[groupId];
  if (mapped && spaces.some((space) => space.id === mapped)) return mapped;
  const group = groups.find((g) => g.id === groupId);
  if (!group?.title) return undefined;
  return spaces.find((space) => space.title === group.title)?.id;
}
