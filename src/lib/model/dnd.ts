import type { Favorite, PinnedNode, Space, SpaceId, SpaceItem, TabId } from './types';

/** Something that can be dragged: a temporary tab, a pin or folder (bookmark node), or a favorite. */
export type Entry = SpaceItem | { kind: 'favorite'; id: string };

/** A list entries can be dropped into: a Space's temporary tabs, a folder's pins, or the favorites. */
export type ListId = `temp:${SpaceId}` | `pins:${string}` | 'favorites';

export type Lists = Partial<Record<ListId, Entry[]>>;

export const entryKey = (entry: Entry): string => `${entry.kind}:${entry.id}`;
export const sameEntry = (a: Entry, b: Entry): boolean => a.kind === b.kind && a.id === b.id;

export const tempList = (spaceId: SpaceId): ListId => `temp:${spaceId}`;
export const pinsList = (parentId: string): ListId => `pins:${parentId}`;
export const FAVORITES_LIST: ListId = 'favorites';

export function parseList(list: ListId): { kind: 'temp' | 'pins' | 'favorites'; id: string } {
  if (list === FAVORITES_LIST) return { kind: 'favorites', id: '' };
  const [kind, ...rest] = list.split(':');
  return { kind: kind as 'temp' | 'pins', id: rest.join(':') };
}

/** What the rules need to know about the sidebar's content. */
export interface DndLookup {
  node(id: string): PinnedNode | undefined;
  favorite(id: string): Favorite | undefined;
  /** Whether folder `ancestorId` contains (or is) the list's folder. */
  contains(ancestorId: string, folderId: string): boolean;
}

/** Every list, from the sidebar's current content. */
export function buildLists(spaces: Space[], favorites: Favorite[]): Lists {
  const lists: Lists = { [FAVORITES_LIST]: favorites.map((f): Entry => ({ kind: 'favorite', id: f.id })) };
  const addPins = (parentId: string, nodes: PinnedNode[]) => {
    lists[pinsList(parentId)] = nodes.map((node): Entry => ({ kind: 'node', id: node.id }));
    for (const node of nodes) if (node.kind === 'folder') addPins(node.id, node.children);
  };
  for (const space of spaces) {
    lists[tempList(space.id)] = space.tabIds.map((id): Entry => ({ kind: 'tab', id }));
    addPins(space.id, space.pinned);
  }
  return lists;
}

/** The tab an entry stands for, if it has one open. */
export function tabOf(entry: Entry, lookup: DndLookup): TabId | undefined {
  if (entry.kind === 'tab') return entry.id;
  if (entry.kind === 'favorite') return lookup.favorite(entry.id)?.tabId;
  const node = lookup.node(entry.id);
  return node?.kind === 'pin' ? node.tabId : undefined;
}

/** Whether an entry may be dropped into a list. */
export function canEnter(entry: Entry, list: ListId, lookup: DndLookup): boolean {
  const { kind, id } = parseList(list);
  const node = entry.kind === 'node' ? lookup.node(entry.id) : undefined;
  if (node?.kind === 'folder') {
    // Folders only move among pins, and never into themselves.
    return kind === 'pins' && !lookup.contains(node.id, id);
  }
  if (entry.kind === 'tab') return true;
  // Pins go anywhere: other folders, the temporary tabs (opening their page if needed), the favorites.
  if (entry.kind === 'node') return true;
  if (kind === 'favorites' && entry.kind === 'favorite') return true;
  // Crossing between favorites, pins and temporary tabs needs an open tab to carry over.
  return tabOf(entry, lookup) !== undefined;
}

export function locate(lists: Lists, entry: Entry): { list: ListId; index: number } | undefined {
  for (const [list, entries] of Object.entries(lists) as [ListId, Entry[]][]) {
    const index = entries.findIndex((e) => sameEntry(e, entry));
    if (index !== -1) return { list, index };
  }
  return undefined;
}

/**
 * Where the dragged entry goes when the pointer is over `target`: just before it, or just
 * after it (`after`, the pointer is past the target's middle). The index is counted
 * without the dragged entry, as `moveEntry` expects.
 */
export function placeAround(
  lists: Lists,
  active: Entry,
  target: Entry,
  after: boolean,
): { list: ListId; index: number } | undefined {
  if (sameEntry(active, target)) return undefined;
  const at = locate(lists, target);
  if (!at) return undefined;
  const others = lists[at.list]!.filter((entry) => !sameEntry(entry, active));
  const index = others.findIndex((entry) => sameEntry(entry, target));
  return { list: at.list, index: after ? index + 1 : index };
}

/** The lists without `entry`. */
export function withoutEntry(lists: Lists, entry: Entry): Lists {
  const at = locate(lists, entry);
  return at ? { ...lists, [at.list]: lists[at.list]!.filter((_, i) => i !== at.index) } : lists;
}

/** Move an entry to `index` in `list` (index counted after removing it from where it was). */
export function moveEntry(lists: Lists, entry: Entry, list: ListId, index: number): Lists {
  const from = locate(lists, entry);
  const next: Lists = { ...lists };
  if (from) next[from.list] = next[from.list]!.filter((_, i) => i !== from.index);
  const target = [...(next[list] ?? [])];
  target.splice(Math.max(0, Math.min(index, target.length)), 0, entry);
  next[list] = target;
  return next;
}

/** A store call that makes a drop real. */
export type DropAction =
  | { type: 'moveTab'; tabId: TabId; spaceId: SpaceId; index?: number }
  | { type: 'pinTab'; tabId: TabId; parentId: string; index?: number }
  | { type: 'unpin'; pinId: string; spaceId: SpaceId; index?: number }
  | { type: 'moveNode'; id: string; parentId: string; index?: number }
  | { type: 'addFavorite'; tabId: TabId; index?: number }
  | { type: 'favoritePin'; pinId: string; index?: number }
  | { type: 'moveFavorite'; favoriteId: string; index: number };

/** Translate "entry now sits at `index` in `list`" into the store call that makes it so. */
export function dropAction(entry: Entry, list: ListId, index: number, lookup: DndLookup): DropAction | undefined {
  const { kind, id } = parseList(list);
  const tabId = tabOf(entry, lookup);
  switch (kind) {
    case 'favorites':
      if (entry.kind === 'favorite') return { type: 'moveFavorite', favoriteId: entry.id, index };
      if (entry.kind === 'node') return { type: 'favoritePin', pinId: entry.id, index };
      return tabId !== undefined ? { type: 'addFavorite', tabId, index } : undefined;
    case 'temp':
      if (entry.kind === 'node') return { type: 'unpin', pinId: entry.id, spaceId: id, index };
      return tabId !== undefined ? { type: 'moveTab', tabId, spaceId: id, index } : undefined;
    case 'pins':
      if (entry.kind === 'node') return { type: 'moveNode', id: entry.id, parentId: id, index };
      return tabId !== undefined ? { type: 'pinTab', tabId, parentId: id, index } : undefined;
  }
}

/**
 * The store calls that drop `group` into `list`, in order, right after `after` (at the start
 * when undefined). Each call's index accounts for the moves before it, so the group lands
 * together even when some of it starts in that list. Entries already in place are skipped.
 */
export function groupDrop(
  lists: Lists,
  group: Entry[],
  list: ListId,
  after: Entry | undefined,
  lookup: DndLookup,
): DropAction[] {
  const actions: DropAction[] = [];
  let current = lists;
  let previous = after;
  for (const entry of group) {
    const others = (current[list] ?? []).filter((other) => !sameEntry(other, entry));
    const index = previous ? others.findIndex((other) => sameEntry(other, previous!)) + 1 : 0;
    const from = locate(current, entry);
    if (from?.list !== list || from.index !== index) {
      const action = dropAction(entry, list, index, lookup);
      if (action) actions.push(action);
    }
    current = moveEntry(current, entry, list, index);
    previous = entry;
  }
  return actions;
}

/** Dropping on a Space's dot in the switcher: move the entry to the end of that Space. */
export function dropOnSpace(entry: Entry, spaceId: SpaceId, lookup: DndLookup): DropAction | undefined {
  if (entry.kind === 'node') return { type: 'moveNode', id: entry.id, parentId: spaceId };
  const tabId = tabOf(entry, lookup);
  return tabId !== undefined ? { type: 'moveTab', tabId, spaceId } : undefined;
}
