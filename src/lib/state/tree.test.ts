import { describe, expect, it } from 'vitest';
import type { Favorite, LiveTab, Space } from '@/lib/model/types';
import {
  deleteNode,
  deleteSpace,
  favoriteTab,
  folderWith,
  including,
  fillNewFolder,
  findNode,
  findPin,
  folderContains,
  moveItem,
  moveNode,
  pinTemporary,
  pinToFavorite,
  pinTab,
  placeTemporary,
  releaseTab,
  removeFavorite,
  renameNode,
  spaceOfNode,
  spaceOfTab,
  unpinNode,
  withPinTab,
} from './tree';

const spaces = (): Space[] => [
  {
    id: 's1',
    name: 'Work',
    hue: 0,
    tabIds: [1, 2],
    pinned: [
      { kind: 'pin', id: 'p1', title: 'A', url: 'https://a', tabId: 7 },
      { kind: 'folder', id: 'f1', title: 'F', children: [{ kind: 'pin', id: 'p2', title: 'B', url: 'https://b', tabId: 8 }] },
    ],
  },
  { id: 's2', name: 'Home', hue: 100, tabIds: [3], pinned: [] },
];

describe('tree operations', () => {
  it('moves a pin into a folder of another Space', () => {
    const next = moveNode(spaces(), 'p1', 'f1', 0);
    expect(next[0]!.pinned.map((n) => n.id)).toEqual(['f1']);
    const folder = next[0]!.pinned[0]!;
    expect(folder.kind === 'folder' && folder.children.map((n) => n.id)).toEqual(['p1', 'p2']);
    expect(moveNode(spaces(), 'p1', 's2')[1]!.pinned.map((n) => n.id)).toEqual(['p1']);
  });

  it('moves temporary tabs between Spaces at an index', () => {
    const next = placeTemporary(spaces(), 1, 's2', 0);
    expect(next[0]!.tabIds).toEqual([2]);
    expect(next[1]!.tabIds).toEqual([1, 3]);
  });

  it('pins a temporary tab and unpins it back', () => {
    const pinned = pinTemporary(spaces(), { kind: 'pin', id: 'new', title: 'T', url: 'https://t', tabId: 2 }, 's1', 1);
    expect(pinned[0]!.tabIds).toEqual([1]);
    expect(pinned[0]!.pinned.map((n) => n.id)).toEqual(['p1', 'new', 'f1']);
    const unpinned = unpinNode(pinned, 'new', 's2', 0);
    expect(unpinned[1]!.tabIds).toEqual([2, 3]);
  });

  it('keeps the open tabs of a deleted folder as temporary tabs', () => {
    expect(deleteNode(spaces(), 'f1')[0]!.tabIds).toEqual([1, 2, 8]);
  });

  it('knows when a folder sits inside another', () => {
    expect(folderContains(spaces(), 'f1', 'f1')).toBe(true);
    expect(folderContains(spaces(), 's1', 'f1')).toBe(false); // Spaces are not folders
  });

  it('moves a pin, with its open tab, to the favorites', () => {
    const { spaces: next, favorites } = pinToFavorite(spaces(), [], 'p2', 0);
    const folder = next[0]!.pinned[1]!;
    expect(folder.kind === 'folder' && folder.children).toEqual([]);
    expect(favorites).toEqual([{ id: 'p2', title: 'B', url: 'https://b', tabId: 8 }]);
  });

  it('fills a new folder with pins and tabs, in order', () => {
    const folder = { kind: 'folder' as const, id: 'new', title: 'New folder', children: [] };
    const pinOf = (tabId: number) => ({ kind: 'pin' as const, id: `pin-${tabId}`, title: 'T', url: 'https://t', tabId });
    const next = fillNewFolder(spaces(), folder, 's1', 0, [{ kind: 'tab', id: 2 }, { kind: 'node', id: 'p1' }], pinOf);
    expect(next[0]!.tabIds).toEqual([1]);
    const created = next[0]!.pinned[0]!;
    expect(created.kind === 'folder' && created.children.map((n) => n.id)).toEqual(['pin-2', 'p1']);
    expect(next[0]!.pinned.map((n) => n.id)).toEqual(['new', 'f1']);
  });

  it('moves list items to a final index', () => {
    expect(moveItem(['a', 'b', 'c'], (x) => x === 'a', 2)).toEqual(['b', 'c', 'a']);
  });
});

describe('tree lookups', () => {
  it('finds pins and folders at any depth, with their Space', () => {
    const all = spaces();
    expect(findNode(all, 'p2')).toMatchObject({ kind: 'pin', title: 'B' });
    expect(findNode(all, 'f1')?.kind).toBe('folder');
    expect(findPin(all, 'f1')).toBeUndefined();
    expect(findNode(all, 'nope')).toBeUndefined();
    expect(spaceOfNode(all, 'p2')?.id).toBe('s1');
    expect(spaceOfNode(all, 's2')?.id).toBe('s2');
    expect(spaceOfTab(all, 3)?.id).toBe('s2');
    expect(spaceOfTab(all, 7)).toBeUndefined(); // a pin's tab isn't a temporary tab
  });

  it('answers from the content it is given, before and after a change', () => {
    const before = spaces();
    expect(findNode(before, 'p2')?.title).toBe('B');
    const after = renameNode(moveNode(before, 'p2', 's2'), 'p2', 'B2');
    expect(findNode(after, 'p2')?.title).toBe('B2');
    expect(spaceOfNode(after, 'p2')?.id).toBe('s2');
    expect(findNode(before, 'p2')?.title).toBe('B');
    expect(spaceOfNode(before, 'p2')?.id).toBe('s1');
  });
});

describe('changes both stores make', () => {
  const tab = (id: number): LiveTab => ({ id, title: `Tab ${id}`, url: `https://t${id}`, status: 'complete' });
  const favorites = (): Favorite[] => [{ id: 'fav', title: 'Mail', url: 'https://mail', tabId: 9 }];
  const content = () => ({ spaces: spaces(), favorites: favorites() });

  it('changes only the path to a pin, and nothing when there is nothing to change', () => {
    const before = spaces();
    const after = withPinTab(before, 'p2', undefined);
    expect(after[1]).toBe(before[1]);
    expect(after[0]!.pinned[0]).toBe(before[0]!.pinned[0]);
    expect(findNode(after, 'p2')).toMatchObject({ tabId: undefined });
    expect(withPinTab(after, 'p2', undefined)).toBe(after);
    expect(renameNode(before, 'nope', 'X')).toBe(before);
    expect(renameNode(before, 's1', 'X')).toBe(before); // a Space isn't a node
  });

  it('unlinks a tab from its pin or favorite', () => {
    const before = content();
    const fromPin = releaseTab(before, 8);
    expect(findNode(fromPin.spaces, 'p2')).toMatchObject({ tabId: undefined });
    expect(fromPin.favorites).toBe(before.favorites);
    const fromFavorite = releaseTab(before, 9);
    expect(fromFavorite.favorites).toEqual([]);
    expect(fromFavorite.spaces).toBe(before.spaces);
  });

  it('pins a tab, leaving its favorite', () => {
    const next = pinTab(content(), tab(9), 'new', 'f1', 0);
    expect(findNode(next.spaces, 'new')).toEqual({ kind: 'pin', id: 'new', title: 'Tab 9', url: 'https://t9', tabId: 9 });
    expect(spaceOfNode(next.spaces, 'new')?.id).toBe('s1');
    expect(next.favorites).toEqual([]);
  });

  it('makes a temporary tab a favorite, and back', () => {
    const favorited = favoriteTab(content(), tab(2), 'fav2', 0);
    expect(favorited.favorites.map((f) => f.id)).toEqual(['fav2', 'fav']);
    expect(favorited.spaces[0]!.tabIds).toEqual([1]);
    const removed = removeFavorite(favorited, 'fav2', 's2');
    expect(removed.favorites.map((f) => f.id)).toEqual(['fav']);
    expect(removed.spaces[1]!.tabIds).toEqual([3, 2]);
  });

  it('makes a folder of a pin and a tab, in order', () => {
    const tabs = new Map([[1, tab(1)]]);
    const folder = { kind: 'folder' as const, id: 'nf', title: 'New folder', children: [] };
    const next = folderWith(content(), folder, 's1', 0, [{ kind: 'node', id: 'p1' }, { kind: 'tab', id: 1 }], tabs, (id) => `pin-${id}`);
    const made = findNode(next.spaces, 'nf');
    expect(made?.kind === 'folder' && made.children.map((child) => child.id)).toEqual(['p1', 'pin-1']);
    expect(next.spaces[0]!.tabIds).toEqual([2]);
  });

  it('names the Space that takes the place of a deleted one', () => {
    const three: Space[] = [...spaces(), { id: 's3', name: 'Play', hue: 200, tabIds: [], pinned: [] }];
    expect(deleteSpace(three, 's2').successor?.id).toBe('s3');
    expect(deleteSpace(three, 's3').successor?.id).toBe('s2');
    expect(deleteSpace(three, 's3').spaces.map((space) => space.id)).toEqual(['s1', 's2']);
    expect(deleteSpace(three, 'nope').successor).toBeUndefined();
  });
});

describe('including', () => {
  it('adds a value, and keeps the set itself when it is already there', () => {
    const open = new Set(['a']);
    expect([...including(open, 'b')]).toEqual(['a', 'b']);
    expect(including(open, 'a')).toBe(open);
  });
});
