import type { Favorite, PinnedNode, Space, SpaceId, SpaceItem, TabId } from './types';

/** Something that can be dragged: a temporary tab, a pin or folder (bookmark node), or a favorite. */
export type Entry = SpaceItem | { kind: 'favorite'; id: string };

/** A list entries can be dropped into: a Space's temporary tabs, a folder's pins, or the favorites. */
export type ListId = `temp:${SpaceId}` | `pins:${string}` | 'favorites';

export type Lists = Partial<Record<ListId, Entry[]>>;

export const entryKey = (entry: Entry): string => `${entry.kind}:${entry.id}`;

/** The entry a key stands for (the inverse of `entryKey`). */
export function entryFromKey(key: string): Entry {
  const [kind, ...rest] = key.split(':');
  const id = rest.join(':');
  return kind === 'tab' ? { kind: 'tab', id: Number(id) } : { kind: kind as 'node' | 'favorite', id };
}
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

/** `items` with `moving` placed just before `target`, or just after it. */
export function moveAround<T>(items: readonly T[], moving: T, target: T, after: boolean): T[] {
  const others = items.filter((item) => item !== moving);
  const at = others.indexOf(target);
  if (moving === target || at === -1) return [...items];
  others.splice(after ? at + 1 : at, 0, moving);
  return others;
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
 * Dropping `group` into `list`, in order, right after `after` (at the start when undefined):
 * the store calls that do it, and the lists once it is done. Each call's index accounts for
 * the moves before it, so the group lands together even when some of it starts in that list.
 * Entries already in place need no call.
 */
export function groupDrop(
  lists: Lists,
  group: Entry[],
  list: ListId,
  after: Entry | undefined,
  lookup: DndLookup,
): { actions: DropAction[]; lists: Lists } {
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
  return { actions, lists: current };
}

/** Where a drop lands, the way the person sees it while dragging. */
export type Slot =
  /** A line just before or after a row (or tile). */
  | { kind: 'beside'; entry: Entry; side: 'before' | 'after' }
  /** Into a folder, at its end: the folder row lights up. */
  | { kind: 'into'; folderId: string }
  /** An empty list: the list lights up. */
  | { kind: 'end'; list: ListId };

export function sameSlot(a: Slot | undefined, b: Slot | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.kind === 'beside' && b.kind === 'beside') return a.side === b.side && sameEntry(a.entry, b.entry);
  if (a.kind === 'into' && b.kind === 'into') return a.folderId === b.folderId;
  return a.kind === 'end' && b.kind === 'end' && a.list === b.list;
}

/**
 * Which part of a row the pointer is in, from how far along the row it is (0 at the top,
 * 1 at the bottom). Rows split in halves; a folder keeps its middle for dropping into it.
 */
export function zoneAt(at: number, folder: boolean): 'before' | 'into' | 'after' {
  if (!folder) return at < 0.5 ? 'before' : 'after';
  return at < 0.25 ? 'before' : at > 0.75 ? 'after' : 'into';
}

/**
 * The slot for the pointer `at` along a row. Right below a folder that shows rows of its own
 * (`inside`, the first of them), the gap belongs to the folder: the line goes before that row.
 */
export function slotAt(entry: Entry, at: number, folder: boolean, inside?: Entry): Slot {
  const zone = zoneAt(at, folder);
  if (zone === 'into') return { kind: 'into', folderId: String(entry.id) };
  if (zone === 'after' && inside) return { kind: 'beside', entry: inside, side: 'before' };
  return { kind: 'beside', entry, side: zone };
}

/** A slot that takes the dragged group: the list it lands in, right after `after`. */
export interface Drop {
  slot: Slot;
  list: ListId;
  /** The entry the group lands right after (not one of its own); undefined for the start. */
  after: Entry | undefined;
}

/**
 * What dropping `group` in `slot` would do. Undefined when the slot can't take all of it,
 * or when the drop would change nothing (then no line shows either).
 */
export function resolveDrop(lists: Lists, group: Entry[], slot: Slot, lookup: DndLookup): Drop | undefined {
  const place = placeOf(lists, slot);
  if (!place || !group.every((entry) => canEnter(entry, place.list, lookup))) return undefined;
  const carried = (entry: Entry) => group.some((other) => sameEntry(other, entry));
  const after = (lists[place.list] ?? []).slice(0, place.index).findLast((entry) => !carried(entry));
  if (groupDrop(lists, group, place.list, after, lookup).actions.length === 0) return undefined;
  return { slot, list: place.list, after };
}

const atEnd = (lists: Lists, list: ListId) => {
  const entries = lists[list];
  return entries && { list, index: entries.length };
};

/** The list a slot is in, and its position there (counting every entry, carried ones too). */
function placeOf(lists: Lists, slot: Slot): { list: ListId; index: number } | undefined {
  switch (slot.kind) {
    case 'beside': {
      const at = locate(lists, slot.entry);
      return at && { list: at.list, index: slot.side === 'before' ? at.index : at.index + 1 };
    }
    case 'into':
      return atEnd(lists, pinsList(slot.folderId));
    case 'end':
      return atEnd(lists, slot.list);
  }
}

/** Dropping on a Space's dot in the switcher: move the entry to the end of that Space. */
export function dropOnSpace(entry: Entry, spaceId: SpaceId, lookup: DndLookup): DropAction | undefined {
  if (entry.kind === 'node') return { type: 'moveNode', id: entry.id, parentId: spaceId };
  const tabId = tabOf(entry, lookup);
  return tabId !== undefined ? { type: 'moveTab', tabId, spaceId } : undefined;
}
