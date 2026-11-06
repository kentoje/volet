import type { Favorite, LiveTab, PinnedNode, Space, TabId } from '@/lib/model/types';

/**
 * Keeps what didn't change between two loads of the sidebar's content. Every refresh builds new
 * objects; handing the previous one back wherever the new one is equal lets the rows that show it
 * skip all work (Svelte compares props and derived values by identity).
 */

export interface Content {
  spaces: Space[];
  favorites: Favorite[];
  tabs: ReadonlyMap<TabId, LiveTab>;
  openFolders: ReadonlySet<string>;
}

/** `next`, with every value equal to the one in `prev` replaced by `prev`'s own object. */
export function reuseContent<T extends Content>(prev: Content, next: T): T {
  return {
    ...next,
    spaces: reuseArray(prev.spaces, next.spaces, reuseSpace),
    favorites: reuseArray(prev.favorites, next.favorites, reuseFlat),
    tabs: reuseTabs(prev.tabs, next.tabs),
    openFolders: sameSet(prev.openFolders, next.openFolders) ? prev.openFolders : next.openFolders,
  };
}

/** `next` with each item reused from `prev` (matched by position), or `prev` itself when nothing changed. */
function reuseArray<T>(prev: readonly T[], next: T[], reuse: (prev: T, next: T) => T): T[] {
  let same = prev.length === next.length;
  const result = next.map((item, index) => {
    const old = prev[index];
    const kept = old === undefined ? item : reuse(old, item);
    if (kept !== old) same = false;
    return kept;
  });
  return same ? (prev as T[]) : result;
}

/** `prev` when both have the same own values (compared with `===`), else `next`. */
function reuseFlat<T extends object>(prev: T, next: T): T {
  const keys = Object.keys(next) as (keyof T)[];
  if (keys.length !== Object.keys(prev).length) return next;
  return keys.every((key) => key in prev && prev[key] === next[key]) ? prev : next;
}

function reuseNode(prev: PinnedNode, next: PinnedNode): PinnedNode {
  if (prev.kind === 'pin' || next.kind === 'pin') return prev.kind === next.kind ? reuseFlat(prev, next) : next;
  const children = reuseArray(prev.children, next.children, reuseNode);
  const node = children === next.children ? next : { ...next, children };
  return reuseFlat(prev, node);
}

function reuseSpace(prev: Space, next: Space): Space {
  const pinned = reuseArray(prev.pinned, next.pinned, reuseNode);
  const tabIds = reuseArray(prev.tabIds, next.tabIds, (old, id) => (old === id ? old : id));
  return reuseFlat(prev, { ...next, pinned, tabIds });
}

/** `next`'s tabs, each reused from `prev` when unchanged; `prev` itself when no tab changed. */
function reuseTabs(prev: ReadonlyMap<TabId, LiveTab>, next: ReadonlyMap<TabId, LiveTab>): ReadonlyMap<TabId, LiveTab> {
  let same = prev.size === next.size;
  const result = new Map<TabId, LiveTab>();
  const prevIds = prev.keys();
  for (const [id, tab] of next) {
    // Same ids in the same order: iteration order matters to whoever lists the Map.
    if (prevIds.next().value !== id) same = false;
    const old = prev.get(id);
    const kept = old === undefined ? tab : reuseFlat(old, tab);
    if (kept !== old) same = false;
    result.set(id, kept);
  }
  return same ? prev : result;
}

function sameSet<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) return false;
  for (const value of b) if (!a.has(value)) return false;
  return true;
}
