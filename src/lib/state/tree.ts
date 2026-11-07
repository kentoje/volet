import type { Favorite, Folder, LiveTab, Pin, PinnedNode, Space, SpaceId, SpaceItem, TabId } from '@/lib/model/types';

/**
 * Pure, immutable operations on the sidebar's content. The Chrome store uses them
 * for optimistic updates, the fake store as its whole implementation, so both
 * behave the same way.
 *
 * A `spaces` array is never changed once made (every operation returns a new one), which lets
 * lookups index each array once and answer from the index after that.
 */

// ───────────────────────────── lookups ─────────────────────────────

interface SpaceIndex {
  /** Every pin and folder, with the Space it's in. */
  nodes: Map<string, { node: PinnedNode; space: Space }>;
  spaces: Map<SpaceId, Space>;
  /** The Space each temporary tab is listed in. */
  tabs: Map<TabId, Space>;
  /** The pin each open pin tab belongs to. */
  pinTabs: Map<TabId, Pin>;
}

const indexes = new WeakMap<readonly Space[], SpaceIndex>();

/**
 * Where everything is in `spaces`, built on first use (rows look things up on every render, and
 * walking the whole tree for each of them adds up). The first match wins, as a walk would find it.
 */
function indexOf(spaces: readonly Space[]): SpaceIndex {
  const cached = indexes.get(spaces);
  if (cached) return cached;
  const index: SpaceIndex = { nodes: new Map(), spaces: new Map(), tabs: new Map(), pinTabs: new Map() };
  const visit = (nodes: PinnedNode[], space: Space) => {
    for (const node of nodes) {
      if (!index.nodes.has(node.id)) index.nodes.set(node.id, { node, space });
      if (node.kind === 'folder') visit(node.children, space);
      else if (node.tabId !== undefined && !index.pinTabs.has(node.tabId)) index.pinTabs.set(node.tabId, node);
    }
  };
  for (const space of spaces) {
    if (!index.spaces.has(space.id)) index.spaces.set(space.id, space);
    for (const tabId of space.tabIds) if (!index.tabs.has(tabId)) index.tabs.set(tabId, space);
    visit(space.pinned, space);
  }
  indexes.set(spaces, index);
  return index;
}

export function findNode(spaces: Space[], id: string): PinnedNode | undefined {
  return indexOf(spaces).nodes.get(id)?.node;
}

export function findPin(spaces: Space[], pinId: string): Pin | undefined {
  const node = findNode(spaces, pinId);
  return node?.kind === 'pin' ? node : undefined;
}

/** The pin whose open tab is `tabId` (the first one, should several claim it). */
export function findPinByTab(spaces: Space[], tabId: TabId): Pin | undefined {
  return indexOf(spaces).pinTabs.get(tabId);
}

/** The Space whose temporary tabs include `tabId`. */
export function spaceOfTab(spaces: Space[], tabId: TabId): Space | undefined {
  return indexOf(spaces).tabs.get(tabId);
}

/** The Space a pin or folder lives in (or the Space itself, given a Space id). Ids are unique. */
export function spaceOfNode(spaces: Space[], id: string): Space | undefined {
  const index = indexOf(spaces);
  return index.spaces.get(id) ?? index.nodes.get(id)?.space;
}

function containsNode(nodes: PinnedNode[], id: string): boolean {
  return nodes.some((node) => node.id === id || (node.kind === 'folder' && containsNode(node.children, id)));
}

/** Whether `folderId` is `ancestorId` or nested inside it. */
export function folderContains(spaces: Space[], ancestorId: string, folderId: string): boolean {
  if (ancestorId === folderId) return true;
  const ancestor = findNode(spaces, ancestorId);
  return ancestor?.kind === 'folder' && containsNode(ancestor.children, folderId);
}

// ───────────────────────────── pins and folders ─────────────────────────────

/**
 * Change one pin or folder. Only the folders and the Space on its path are copied: everything
 * else keeps its object (and `spaces` itself is returned when nothing changed).
 */
export function updateNode(spaces: Space[], id: string, change: (node: PinnedNode) => PinnedNode): Space[] {
  const home = spaceOfNode(spaces, id);
  if (!home || home.id === id) return spaces;
  const update = (nodes: PinnedNode[]): PinnedNode[] => {
    let changed = false;
    const next = nodes.map((node) => {
      let result = node;
      if (node.id === id) result = change(node);
      else if (node.kind === 'folder' && containsNode(node.children, id)) {
        const children = update(node.children);
        if (children !== node.children) result = { ...node, children };
      }
      if (result !== node) changed = true;
      return result;
    });
    return changed ? next : nodes;
  };
  const pinned = update(home.pinned);
  if (pinned === home.pinned) return spaces;
  return spaces.map((space) => (space === home ? { ...space, pinned } : space));
}

/** Change one pin (a folder with that id is left alone). */
export function updatePin(spaces: Space[], pinId: string, change: (pin: Pin) => Pin): Space[] {
  return updateNode(spaces, pinId, (node) => (node.kind === 'pin' ? change(node) : node));
}

export function withPinTab(spaces: Space[], pinId: string, tabId: TabId | undefined): Space[] {
  return updatePin(spaces, pinId, (pin) => (pin.tabId === tabId ? pin : { ...pin, tabId }));
}

function mapNodes(nodes: PinnedNode[], change: (node: PinnedNode) => PinnedNode): PinnedNode[] {
  return nodes.map((node) => {
    const changed = change(node);
    return changed.kind === 'folder' ? { ...changed, children: mapNodes(changed.children, change) } : changed;
  });
}

/** Rename a pin or folder. A renamed pin keeps that name, whatever page its tab shows (`Pin.named`). */
export function renameNode(spaces: Space[], id: string, title: string): Space[] {
  return updateNode(spaces, id, (node) => (node.kind === 'pin' ? { ...node, title, named: true } : { ...node, title }));
}

function removeFrom(nodes: PinnedNode[], id: string): { nodes: PinnedNode[]; removed?: PinnedNode } {
  let removed: PinnedNode | undefined;
  const walk = (list: PinnedNode[]): PinnedNode[] =>
    list.flatMap((node): PinnedNode[] => {
      if (node.id === id) {
        removed = node;
        return [];
      }
      return node.kind === 'folder' ? [{ ...node, children: walk(node.children) }] : [node];
    });
  return { nodes: walk(nodes), removed };
}

/** Remove a pin or folder; returns it with the Space it was in. */
function removeNode(spaces: Space[], id: string): { spaces: Space[]; removed?: PinnedNode; from?: SpaceId } {
  let removed: PinnedNode | undefined;
  let from: SpaceId | undefined;
  const next = spaces.map((space) => {
    const result = removeFrom(space.pinned, id);
    if (!result.removed) return space;
    removed = result.removed;
    from = space.id;
    return { ...space, pinned: result.nodes };
  });
  return { spaces: next, removed, from };
}

/** Insert a node into a Space (parentId = Space id) or a folder, at `index` (end if omitted). */
export function insertNode(spaces: Space[], node: PinnedNode, parentId: string, index?: number): Space[] {
  const place = (list: PinnedNode[]) => {
    const copy = [...list];
    copy.splice(index ?? copy.length, 0, node);
    return copy;
  };
  return spaces.map((space) => {
    if (space.id === parentId) return { ...space, pinned: place(space.pinned) };
    if (!containsNode(space.pinned, parentId)) return space;
    return {
      ...space,
      pinned: mapNodes(space.pinned, (n) =>
        n.id === parentId && n.kind === 'folder' ? { ...n, children: place(n.children) } : n,
      ),
    };
  });
}

export function moveNode(spaces: Space[], id: string, parentId: string, index?: number): Space[] {
  const { spaces: without, removed } = removeNode(spaces, id);
  return removed ? insertNode(without, removed, parentId, index) : spaces;
}

/**
 * Insert `folder` (empty) at `index` in a Space or folder, then put `items` in it in order:
 * pins and folders move in, tabs become the pins `pinOf` makes for them.
 */
export function fillNewFolder(
  spaces: Space[],
  folder: Folder,
  parentId: string,
  index: number | undefined,
  items: SpaceItem[],
  pinOf: (tabId: TabId) => Pin | undefined,
): Space[] {
  let next = insertNode(spaces, folder, parentId, index);
  for (const item of items) {
    if (item.kind === 'node') {
      next = moveNode(next, item.id, folder.id);
    } else {
      const pin = pinOf(item.id);
      if (pin) next = pinTemporary(next, pin, folder.id);
    }
  }
  return next;
}

/** Delete a pin or folder. Tabs that were open in its pins stay, as temporary tabs. */
export function deleteNode(spaces: Space[], id: string): Space[] {
  const { spaces: without, removed, from } = removeNode(spaces, id);
  if (!removed || !from) return spaces;
  const orphans = openTabsIn([removed]);
  return without.map((space) => (space.id === from ? { ...space, tabIds: [...space.tabIds, ...orphans] } : space));
}

function openTabsIn(nodes: PinnedNode[]): TabId[] {
  return nodes.flatMap((node): TabId[] => {
    if (node.kind === 'folder') return openTabsIn(node.children);
    return node.tabId !== undefined ? [node.tabId] : [];
  });
}

// ───────────────────────────── temporary tabs ─────────────────────────────

export function withoutTab(spaces: Space[], tabId: TabId): Space[] {
  return spaces.map((space) =>
    space.tabIds.includes(tabId) ? { ...space, tabIds: space.tabIds.filter((id) => id !== tabId) } : space,
  );
}

/** The temporary tabs "Clear" closes: all of them but the active tab, which stays open. */
export function tabsToClear(space: Space, activeTabId: TabId | undefined): TabId[] {
  return space.tabIds.filter((id) => id !== activeTabId);
}

/** A Space's temporary tabs cleared: only the active tab is left, if it was one of them. */
export function withTemporaryCleared(spaces: Space[], spaceId: SpaceId, activeTabId: TabId | undefined): Space[] {
  return spaces.map((space) =>
    space.id === spaceId ? { ...space, tabIds: space.tabIds.filter((id) => id === activeTabId) } : space,
  );
}

/** Put a tab among a Space's temporary tabs at `index` (end if omitted), removing it from anywhere else. */
export function placeTemporary(spaces: Space[], tabId: TabId, spaceId: SpaceId, index?: number): Space[] {
  return withoutTab(spaces, tabId).map((space) => {
    if (space.id !== spaceId) return space;
    const tabIds = [...space.tabIds];
    tabIds.splice(index ?? tabIds.length, 0, tabId);
    return { ...space, tabIds };
  });
}

/** Turn a temporary tab into a pin. */
export function pinTemporary(spaces: Space[], pin: Pin, parentId: string, index?: number): Space[] {
  const without = pin.tabId !== undefined ? withoutTab(spaces, pin.tabId) : spaces;
  return insertNode(without, pin, parentId, index);
}

/** Turn a pin back into a temporary tab (its open tab, if any, moves to the list). */
export function unpinNode(spaces: Space[], pinId: string, spaceId: SpaceId, index?: number): Space[] {
  const { spaces: without, removed } = removeNode(spaces, pinId);
  if (removed?.kind !== 'pin' || removed.tabId === undefined) return without;
  return placeTemporary(without, removed.tabId, spaceId, index);
}

// ───────────────────────────── favorites and Spaces ─────────────────────────────

/** Move one item of a list to `index` (counted after removing it). */
export function moveItem<T>(items: T[], match: (item: T) => boolean, index: number): T[] {
  const from = items.findIndex(match);
  const item = items[from];
  if (item === undefined) return items;
  const copy = items.filter((_, i) => i !== from);
  copy.splice(index, 0, item);
  return copy;
}

/** Move a pin out of its Space into the favorites, keeping its name and open tab. */
export function pinToFavorite(
  spaces: Space[],
  favorites: Favorite[],
  pinId: string,
  index?: number,
): { spaces: Space[]; favorites: Favorite[] } {
  const { spaces: without, removed } = removeNode(spaces, pinId);
  if (removed?.kind !== 'pin') return { spaces, favorites };
  const favorite = { id: removed.id, title: removed.title, url: removed.url, tabId: removed.tabId };
  return { spaces: without, favorites: insertFavorite(favorites, favorite, index) };
}

export function insertFavorite(favorites: Favorite[], favorite: Favorite, index?: number): Favorite[] {
  const copy = [...favorites];
  copy.splice(index ?? copy.length, 0, favorite);
  return copy;
}

export function updateSpace(spaces: Space[], spaceId: SpaceId, change: Partial<Space>): Space[] {
  return spaces.map((space) => (space.id === spaceId ? { ...space, ...change } : space));
}

/** `set` with `value` in it (`set` itself when it already was). */
export function including<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  return set.has(value) ? set : new Set([...set, value]);
}

/** A copy of `set` with `value` added or removed. */
export function toggled<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/** A copy of `map` with `key` set to `value`, or removed when `value` is undefined. */
export function withKey<K, V>(map: ReadonlyMap<K, V>, key: K, value: V | undefined): ReadonlyMap<K, V> {
  const next = new Map(map);
  if (value === undefined) next.delete(key);
  else next.set(key, value);
  return next;
}

/** A set of the numbers 0 to count - 1 (e.g. "every item chosen"). */
export function range(count: number, keep: (index: number) => boolean = () => true): ReadonlySet<number> {
  return new Set(Array.from({ length: count }, (_, index) => index).filter(keep));
}

// ───────────────────────────── changes both stores make ─────────────────────────────

/** The sidebar's saved lists: what most changes touch. */
export interface SpacesAndFavorites {
  spaces: Space[];
  favorites: Favorite[];
}

/** The title a new folder starts with (then renamed in place). */
export const NEW_FOLDER_TITLE = 'New folder';

/** The pin a tab becomes when it's pinned, titled after its page. */
export function pinFromTab(tab: LiveTab, id: string): Pin {
  return { kind: 'pin', id, title: tab.title, url: tab.url, tabId: tab.id };
}

/** A tab leaving its favorite or pin (moving elsewhere): unlink it there, as the engine does. */
export function releaseTab({ spaces, favorites }: SpacesAndFavorites, tabId: TabId): SpacesAndFavorites {
  const pin = findPinByTab(spaces, tabId);
  return {
    spaces: pin ? withPinTab(spaces, pin.id, undefined) : spaces,
    favorites: favorites.some((favorite) => favorite.tabId === tabId)
      ? favorites.filter((favorite) => favorite.tabId !== tabId)
      : favorites,
  };
}

/** Move a tab among a Space's temporary tabs (from wherever it was: a list, a pin, a favorite). */
export function moveTab(content: SpacesAndFavorites, tabId: TabId, spaceId: SpaceId, index?: number): SpacesAndFavorites {
  const { spaces, favorites } = releaseTab(content, tabId);
  return { spaces: placeTemporary(spaces, tabId, spaceId, index), favorites };
}

/** Pin a tab, as `pinId`, into a Space or folder. */
export function pinTab(
  content: SpacesAndFavorites,
  tab: LiveTab,
  pinId: string,
  parentId: string,
  index?: number,
): SpacesAndFavorites {
  const { spaces, favorites } = releaseTab(content, tab.id);
  return { spaces: pinTemporary(spaces, pinFromTab(tab, pinId), parentId, index), favorites };
}

/** Make a tab a favorite, as `favoriteId`, at `index` (end if omitted). */
export function favoriteTab(
  content: SpacesAndFavorites,
  tab: LiveTab,
  favoriteId: string,
  index?: number,
): SpacesAndFavorites {
  const { spaces, favorites } = releaseTab(content, tab.id);
  const favorite = { id: favoriteId, title: tab.title, url: tab.url, tabId: tab.id };
  return { spaces: withoutTab(spaces, tab.id), favorites: insertFavorite(favorites, favorite, index) };
}

/** Remove a favorite; its open tab, if any, joins `spaceId`'s temporary tabs. */
export function removeFavorite(
  { spaces, favorites }: SpacesAndFavorites,
  favoriteId: string,
  spaceId: SpaceId,
): SpacesAndFavorites {
  const tabId = favorites.find((favorite) => favorite.id === favoriteId)?.tabId;
  return {
    spaces: tabId !== undefined ? placeTemporary(spaces, tabId, spaceId) : spaces,
    favorites: favorites.filter((favorite) => favorite.id !== favoriteId),
  };
}

/**
 * Make `folder` at `index` in a Space or folder, holding `items` in order: pins and folders move
 * in, tabs are pinned in (as the pins `pinId` names) and leave any favorite or pin they had.
 */
export function folderWith(
  content: SpacesAndFavorites,
  folder: Folder,
  parentId: string,
  index: number | undefined,
  items: SpaceItem[],
  tabs: ReadonlyMap<TabId, LiveTab>,
  pinId: (tabId: TabId) => string,
): SpacesAndFavorites {
  let released = content;
  for (const item of items) if (item.kind === 'tab') released = releaseTab(released, item.id);
  const spaces = fillNewFolder(released.spaces, folder, parentId, index, items, (tabId) => {
    const tab = tabs.get(tabId);
    return tab && pinFromTab(tab, pinId(tabId));
  });
  return { spaces, favorites: released.favorites };
}

/** Delete a Space; `successor` is the one that takes its place (the next, else the previous). */
export function deleteSpace(spaces: Space[], spaceId: SpaceId): { spaces: Space[]; successor?: Space } {
  const index = spaces.findIndex((space) => space.id === spaceId);
  const rest = spaces.filter((space) => space.id !== spaceId);
  return { spaces: rest, successor: rest[index] ?? rest[index - 1] };
}
