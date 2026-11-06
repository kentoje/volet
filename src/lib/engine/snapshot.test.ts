import { describe, expect, it } from 'vitest';
import { type BookmarkNode, findBookmark, isSpaceFolder, spaceFolders, spaceOfBookmark, tabUrl } from './snapshot';

const root = (): BookmarkNode => ({
  id: 'root',
  title: 'Volet',
  children: [
    { id: 'favs', title: 'Favorites', children: [{ id: 'mail', title: 'Mail', url: 'https://mail' }] },
    {
      id: 'work',
      title: 'Work',
      children: [
        { id: 'p1', title: 'A', url: 'https://a' },
        { id: 'f1', title: 'F', children: [{ id: 'p2', title: 'B', url: 'https://b' }] },
      ],
    },
    { id: 'loose', title: 'Loose', url: 'https://loose' },
    { id: 'home', title: 'Home', children: [] },
  ],
});

describe('bookmark lookups', () => {
  it('finds any bookmark, the root included', () => {
    const tree = root();
    expect(findBookmark(tree, 'p2')?.title).toBe('B');
    expect(findBookmark(tree, 'root')).toBe(tree);
    expect(findBookmark(tree, 'loose')?.url).toBe('https://loose');
    expect(findBookmark(tree, 'nope')).toBeUndefined();
    expect(findBookmark(undefined, 'p2')).toBeUndefined();
  });

  it('names the folder of the root a bookmark is in', () => {
    const tree = root();
    expect(spaceOfBookmark(tree, 'p2')).toBe('work');
    expect(spaceOfBookmark(tree, 'work')).toBe('work');
    expect(spaceOfBookmark(tree, 'mail')).toBe('favs');
    expect(spaceOfBookmark(tree, 'loose')).toBeUndefined();
    expect(spaceOfBookmark(tree, 'root')).toBeUndefined();
  });

  it('tells Spaces from Favorites and loose bookmarks', () => {
    const tree = root();
    expect(spaceFolders(tree, 'favs').map((node) => node.id)).toEqual(['work', 'home']);
    expect(isSpaceFolder(tree.children![0]!, 'favs')).toBe(false);
  });

  it('reads a tab URL before its first navigation commits', () => {
    expect(tabUrl({ url: '', pendingUrl: 'https://next' })).toBe('https://next');
    expect(tabUrl({ url: 'https://now', pendingUrl: 'https://next' })).toBe('https://now');
    expect(tabUrl({})).toBeUndefined();
  });
});
