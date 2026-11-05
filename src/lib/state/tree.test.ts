import { describe, expect, it } from 'vitest';
import type { Space } from '@/lib/model/types';
import {
  deleteNode,
  fillNewFolder,
  folderContains,
  moveItem,
  moveNode,
  pinTemporary,
  pinToFavorite,
  placeTemporary,
  unpinNode,
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
