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

/** A bookmark with a URL: a pin or a favorite (folders have none). */
export type PinNode = BookmarkNode & { url: string };

export const isPin = (node: BookmarkNode): node is PinNode => node.url !== undefined;

/** The ids of `tabs` (Chrome may leave one without, say a devtools tab). */
export function tabIds(tabs: { id?: number }[]): number[] {
  return tabs.flatMap((tab) => (tab.id === undefined ? [] : [tab.id]));
}

/** Everything needed to compute what one window's sidebar shows. */
export interface Snapshot {
  windowId: number;
  /** Tabs of this window, in tab strip order. */
  tabs: TabInfo[];
  groups: GroupInfo[];
  /** The root "Volet" bookmark folder, with its whole subtree. */
  root: BookmarkNode | undefined;
  favoritesId: string | undefined;
  bindings: Record<string, Binding>;
  groupSpaces: Record<string, string>;
  activeSpaces: Record<string, string>;
  spaceMeta: Record<string, SpaceMeta>;
  /** Folders shown open (see `openFoldersItem`). */
  openFolders: string[];
  /** The titles Volet gave bookmarks from their page, by bookmark id (see `titles.ts`). */
  autoTitles: Record<string, string>;
}

export const NO_GROUP = -1;

/** A tab's URL. Chrome leaves `url` empty until the first navigation commits. */
export function tabUrl(tab: Pick<TabInfo, 'url' | 'pendingUrl'>): string | undefined {
  return tab.url || tab.pendingUrl || undefined;
}

/** Whether a child of the root is a Space: any folder but Favorites. */
export function isSpaceFolder(node: BookmarkNode, favoritesId: string | undefined): boolean {
  return node.url === undefined && node.id !== favoritesId;
}

/** Space folders: every folder in the root except Favorites, in bookmark order. */
export function spaceFolders(root: BookmarkNode | undefined, favoritesId: string | undefined): BookmarkNode[] {
  return (root?.children ?? []).filter((node) => isSpaceFolder(node, favoritesId));
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

interface BookmarkIndex {
  /** Every bookmark in the tree, the tree's own node included. */
  nodes: Map<string, BookmarkNode>;
  /** The folder among the tree's direct children (a Space, or Favorites) each bookmark is in. */
  folders: Map<string, string>;
}

const bookmarkIndexes = new WeakMap<BookmarkNode, BookmarkIndex>();

/**
 * Where everything is in a bookmark tree, built on first use: commands and reconcile look up a
 * bookmark for each tab, and walking the tree each time adds up. Trees are never changed once
 * read from Chrome (a new read makes a new tree). The first match wins, as a walk would find it.
 */
function indexOf(tree: BookmarkNode): BookmarkIndex {
  const cached = bookmarkIndexes.get(tree);
  if (cached) return cached;
  const index: BookmarkIndex = { nodes: new Map([[tree.id, tree]]), folders: new Map() };
  const visit = (node: BookmarkNode, folderId: string) => {
    if (!index.nodes.has(node.id)) index.nodes.set(node.id, node);
    if (!index.folders.has(node.id)) index.folders.set(node.id, folderId);
    node.children?.forEach((child) => visit(child, folderId));
  };
  for (const child of tree.children ?? []) {
    if (child.url === undefined) visit(child, child.id);
    else if (!index.nodes.has(child.id)) index.nodes.set(child.id, child);
  }
  bookmarkIndexes.set(tree, index);
  return index;
}

export function findBookmark(root: BookmarkNode | undefined, id: string): BookmarkNode | undefined {
  return root && indexOf(root).nodes.get(id);
}

/** The Space folder (direct child of the root) that contains a bookmark. */
export function spaceOfBookmark(root: BookmarkNode | undefined, id: string): string | undefined {
  return root && indexOf(root).folders.get(id);
}

/** All pins (bookmarks with a URL) inside a folder, depth-first. */
export function pinsIn(folder: BookmarkNode | undefined): PinNode[] {
  if (!folder) return [];
  return (folder.children ?? []).flatMap((node) => (isPin(node) ? [node] : pinsIn(node)));
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
