import { describe, expect, it } from 'vitest';
import { type DndLookup, buildLists, canEnter, dropAction, dropOnSpace, moveEntry, placeAround } from './dnd';
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

describe('placeAround', () => {
  const lists = buildLists(spaces, favorites);
  const tab = (id: number) => ({ kind: 'tab', id }) as const;

  it('goes before or after the hovered entry depending on the pointer', () => {
    expect(placeAround(lists, tab(4), { kind: 'node', id: 'docs' }, false)).toEqual({ list: 'pins:s1', index: 1 });
    expect(placeAround(lists, tab(4), { kind: 'node', id: 'docs' }, true)).toEqual({ list: 'pins:s1', index: 2 });
  });

  it('can reach the end of a list, which "take its place" alone never could', () => {
    const place = placeAround(lists, tab(1), tab(3), true)!;
    expect(moveEntry(lists, tab(1), place.list, place.index)['temp:s1']!.map((e) => e.id)).toEqual([2, 3, 1]);
  });

  it('counts positions without the dragged entry when moving within a list', () => {
    expect(placeAround(lists, tab(1), tab(2), false)).toEqual({ list: 'temp:s1', index: 0 });
    expect(placeAround(lists, tab(1), tab(2), true)).toEqual({ list: 'temp:s1', index: 1 });
    expect(placeAround(lists, tab(1), tab(1), true)).toBeUndefined();
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
