import { describe, expect, it } from 'vitest';
import {
  type DndLookup,
  buildLists,
  canEnter,
  dropAction,
  dropOnSpace,
  entryFromKey,
  entryKey,
  groupDrop,
  moveAround,
  moveEntry,
  resolveDrop,
  slotAt,
  tempList,
  zoneAt,
} from './dnd';
import type { Favorite, PinnedNode, Space } from './types';

const nodes: PinnedNode[] = [
  { kind: 'pin', id: 'p1', title: 'Issues', url: 'https://a', tabId: 7 },
  {
    kind: 'folder',
    id: 'docs',
    title: 'Docs',
    children: [
      { kind: 'pin', id: 'p2', title: 'Wiki', url: 'https://b' },
      { kind: 'folder', id: 'deep', title: 'Deep', children: [] },
    ],
  },
];
const spaces: Space[] = [
  { id: 's1', name: 'Work', hue: 0, pinned: nodes, tabIds: [1, 2, 3] },
  { id: 's2', name: 'Home', hue: 100, pinned: [], tabIds: [4] },
];
const favorites: Favorite[] = [
  { id: 'f1', title: 'Mail', url: 'https://m', tabId: 9 },
  { id: 'f2', title: 'Cal', url: 'https://c' },
];

const flat = new Map<string, PinnedNode>();
const walk = (list: PinnedNode[]) =>
  list.forEach((n) => {
    flat.set(n.id, n);
    if (n.kind === 'folder') walk(n.children);
  });
walk(nodes);
const lookup: DndLookup = {
  node: (id) => flat.get(id),
  favorite: (id) => favorites.find((f) => f.id === id),
  contains: (ancestor, folder) => ancestor === folder || (ancestor === 'docs' && folder === 'deep'),
};

describe('buildLists', () => {
  it('creates a list per Space, per folder, and for favorites', () => {
    const lists = buildLists(spaces, favorites);
    expect(Object.keys(lists).sort()).toEqual(
      ['favorites', 'pins:deep', 'pins:docs', 'pins:s1', 'pins:s2', 'temp:s1', 'temp:s2'].sort(),
    );
    expect(lists['temp:s1']).toEqual([1, 2, 3].map((id) => ({ kind: 'tab', id })));
  });
});

describe('moveEntry', () => {
  it('reorders within a list and moves across lists', () => {
    const lists = buildLists(spaces, favorites);
    const reordered = moveEntry(lists, { kind: 'tab', id: 1 }, 'temp:s1', 2);
    expect(reordered['temp:s1']!.map((e) => e.id)).toEqual([2, 3, 1]);
    const moved = moveEntry(lists, { kind: 'tab', id: 1 }, 'pins:docs', 0);
    expect(moved['temp:s1']!.map((e) => e.id)).toEqual([2, 3]);
    expect(moved['pins:docs']![0]).toEqual({ kind: 'tab', id: 1 });
  });
});

describe('canEnter', () => {
  it('keeps folders among pins and out of themselves', () => {
    const folder = { kind: 'node', id: 'docs' } as const;
    expect(canEnter(folder, 'pins:s1', lookup)).toBe(true);
    expect(canEnter(folder, 'pins:deep', lookup)).toBe(false);
    expect(canEnter(folder, 'temp:s1', lookup)).toBe(false);
    expect(canEnter(folder, 'favorites', lookup)).toBe(false);
  });

  it('needs an open tab to turn a pin or favorite into something else', () => {
    expect(canEnter({ kind: 'node', id: 'p1' }, 'favorites', lookup)).toBe(true); // has tab 7
    expect(canEnter({ kind: 'node', id: 'p2' }, 'favorites', lookup)).toBe(true); // the pin itself moves
    expect(canEnter({ kind: 'node', id: 'p2' }, 'temp:s2', lookup)).toBe(true); // unpinning opens it
    expect(canEnter({ kind: 'favorite', id: 'f2' }, 'temp:s1', lookup)).toBe(false);
    expect(canEnter({ kind: 'favorite', id: 'f1' }, 'pins:s1', lookup)).toBe(true);
  });
});

describe('dropAction', () => {
  it('maps each kind of drop to a store call', () => {
    expect(dropAction({ kind: 'tab', id: 2 }, 'temp:s2', 0, lookup)).toEqual({ type: 'moveTab', tabId: 2, spaceId: 's2', index: 0 });
    expect(dropAction({ kind: 'tab', id: 2 }, 'pins:docs', 1, lookup)).toEqual({ type: 'pinTab', tabId: 2, parentId: 'docs', index: 1 });
    expect(dropAction({ kind: 'node', id: 'p2' }, 'temp:s1', 3, lookup)).toEqual({ type: 'unpin', pinId: 'p2', spaceId: 's1', index: 3 });
    expect(dropAction({ kind: 'node', id: 'p2' }, 'pins:s1', 0, lookup)).toEqual({ type: 'moveNode', id: 'p2', parentId: 's1', index: 0 });
    expect(dropAction({ kind: 'tab', id: 3 }, 'favorites', 1, lookup)).toEqual({ type: 'addFavorite', tabId: 3, index: 1 });
    expect(dropAction({ kind: 'favorite', id: 'f1' }, 'favorites', 1, lookup)).toEqual({ type: 'moveFavorite', favoriteId: 'f1', index: 1 });
    expect(dropAction({ kind: 'favorite', id: 'f1' }, 'temp:s1', 0, lookup)).toEqual({ type: 'moveTab', tabId: 9, spaceId: 's1', index: 0 });
    expect(dropAction({ kind: 'node', id: 'p2' }, 'favorites', 0, lookup)).toEqual({ type: 'favoritePin', pinId: 'p2', index: 0 });
  });

  it('moves entries dropped on a Space dot to the end of that Space', () => {
    expect(dropOnSpace({ kind: 'tab', id: 1 }, 's2', lookup)).toEqual({ type: 'moveTab', tabId: 1, spaceId: 's2' });
    expect(dropOnSpace({ kind: 'node', id: 'docs' }, 's2', lookup)).toEqual({ type: 'moveNode', id: 'docs', parentId: 's2' });
    expect(dropOnSpace({ kind: 'favorite', id: 'f2' }, 's2', lookup)).toBeUndefined();
  });
});

describe('groupDrop', () => {
  const tab = (id: number) => ({ kind: 'tab' as const, id });

  it('lands the group together, in order, even when it starts around the target', () => {
    // [1, 2, 3, 4, 5], drop 2 and 4 after 5: they end up [1, 3, 5, 2, 4].
    const lists = buildLists([{ id: 's', name: 'S', hue: 0, pinned: [], tabIds: [1, 2, 3, 4, 5] }], []);
    const drop = groupDrop(lists, [tab(2), tab(4)], tempList('s'), tab(5), lookup);
    expect(drop.actions).toEqual([
      { type: 'moveTab', tabId: 2, spaceId: 's', index: 4 },
      { type: 'moveTab', tabId: 4, spaceId: 's', index: 4 },
    ]);
    expect(drop.lists['temp:s']!.map((entry) => entry.id)).toEqual([1, 3, 5, 2, 4]);
  });

  it('skips entries already in place', () => {
    expect(groupDrop(buildLists(spaces, favorites), [tab(1), tab(3)], tempList('s1'), tab(2), lookup).actions).toEqual([
      { type: 'moveTab', tabId: 1, spaceId: 's1', index: 1 },
    ]);
  });

  it('pins tabs one after the other, from the start of a list', () => {
    expect(groupDrop(buildLists(spaces, favorites), [tab(2), tab(3)], 'pins:s1', undefined, lookup).actions).toEqual([
      { type: 'pinTab', tabId: 2, parentId: 's1', index: 0 },
      { type: 'pinTab', tabId: 3, parentId: 's1', index: 1 },
    ]);
  });
});

describe('entryFromKey', () => {
  it('reads back what entryKey wrote', () => {
    for (const entry of [{ kind: 'tab', id: 12 }, { kind: 'node', id: 'docs' }, { kind: 'favorite', id: 'f1' }] as const) {
      expect(entryFromKey(entryKey(entry))).toEqual(entry);
    }
  });
});

describe('zoneAt and slotAt', () => {
  const docs = { kind: 'node' as const, id: 'docs' };

  it('splits rows in halves, and keeps a folder its middle', () => {
    expect([0.2, 0.6].map((at) => zoneAt(at, false))).toEqual(['before', 'after']);
    expect([0.2, 0.5, 0.9].map((at) => zoneAt(at, true))).toEqual(['before', 'into', 'after']);
  });

  it('puts the line below a folder before its first row, when it shows rows', () => {
    const wiki = { kind: 'node' as const, id: 'p2' };
    expect(slotAt(docs, 0.5, true, wiki)).toEqual({ kind: 'into', folderId: 'docs' });
    expect(slotAt(docs, 0.9, true, wiki)).toEqual({ kind: 'beside', entry: wiki, side: 'before' });
    expect(slotAt(docs, 0.9, true)).toEqual({ kind: 'beside', entry: docs, side: 'after' });
    expect(slotAt({ kind: 'tab', id: 1 }, 0.7, false)).toEqual({ kind: 'beside', entry: { kind: 'tab', id: 1 }, side: 'after' });
  });
});

describe('resolveDrop', () => {
  const lists = buildLists(spaces, favorites);
  const tab = (id: number) => ({ kind: 'tab' as const, id });
  const beside = (entry: { kind: 'tab'; id: number } | { kind: 'node'; id: string }, side: 'before' | 'after') =>
    ({ kind: 'beside', entry, side }) as const;

  it('lands right after the entry before the line', () => {
    expect(resolveDrop(lists, [tab(3)], beside(tab(1), 'before'), lookup)).toMatchObject({ list: 'temp:s1', after: undefined });
    expect(resolveDrop(lists, [tab(1)], beside(tab(3), 'after'), lookup)).toMatchObject({ list: 'temp:s1', after: tab(3) });
  });

  it('shows nothing where the drop would change nothing', () => {
    expect(resolveDrop(lists, [tab(1)], beside(tab(1), 'after'), lookup)).toBeUndefined();
    expect(resolveDrop(lists, [tab(1)], beside(tab(2), 'before'), lookup)).toBeUndefined();
  });

  it('skips the carried rows when finding where the group lands', () => {
    // [1, 2, 3]: 1 and 3 dropped after 2 land as [2, 1, 3].
    expect(resolveDrop(lists, [tab(1), tab(3)], beside(tab(2), 'after'), lookup)).toMatchObject({ after: tab(2) });
  });

  it('drops into a folder at its end, and into empty lists', () => {
    expect(resolveDrop(lists, [tab(2)], { kind: 'into', folderId: 'docs' }, lookup)).toMatchObject({
      list: 'pins:docs',
      after: { kind: 'node', id: 'deep' },
    });
    expect(resolveDrop(lists, [tab(2)], { kind: 'end', list: 'pins:s2' }, lookup)).toMatchObject({ list: 'pins:s2', after: undefined });
  });

  it('refuses what the list does not take', () => {
    const docs = { kind: 'node' as const, id: 'docs' };
    expect(resolveDrop(lists, [docs], { kind: 'into', folderId: 'deep' }, lookup)).toBeUndefined();
    expect(resolveDrop(lists, [docs], beside({ kind: 'node', id: 'p2' }, 'after'), lookup)).toBeUndefined();
    expect(resolveDrop(lists, [docs], beside(tab(1), 'before'), lookup)).toBeUndefined();
    expect(resolveDrop(lists, [{ kind: 'favorite', id: 'f2' }], beside(tab(1), 'before'), lookup)).toBeUndefined();
  });
});

describe('moveAround', () => {
  it('places an item just before or just after another', () => {
    expect(moveAround(['a', 'b', 'c'], 'c', 'a', false)).toEqual(['c', 'a', 'b']);
    expect(moveAround(['a', 'b', 'c'], 'a', 'b', true)).toEqual(['b', 'a', 'c']);
    expect(moveAround(['a', 'b', 'c'], 'a', 'a', true)).toEqual(['a', 'b', 'c']);
  });
});
