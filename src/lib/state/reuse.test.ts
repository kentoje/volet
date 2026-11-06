import { describe, expect, it } from 'vitest';
import type { LiveTab, Space } from '@/lib/model/types';
import { type Content, reuseContent } from './reuse';

const content = (): Content => ({
  spaces: [
    {
      id: 's1',
      name: 'Work',
      hue: 0,
      tabIds: [1, 2],
      pinned: [
        { kind: 'pin', id: 'p1', title: 'A', url: 'https://a', tabId: 7 },
        { kind: 'folder', id: 'f1', title: 'F', children: [{ kind: 'pin', id: 'p2', title: 'B', url: 'https://b', tabId: undefined }] },
      ],
    },
    { id: 's2', name: 'Home', hue: 100, tabIds: [3], pinned: [] },
  ],
  favorites: [{ id: 'fav', title: 'Mail', url: 'https://mail', tabId: undefined }],
  tabs: new Map<number, LiveTab>([
    [1, { id: 1, title: 'One', url: 'https://one', status: 'complete' }],
    [2, { id: 2, title: 'Two', url: 'https://two', status: 'loading' }],
  ]),
  collapsedFolders: new Set(['f1']),
});

describe('reuseContent', () => {
  it('hands back the previous objects when nothing changed', () => {
    const prev = content();
    const next = reuseContent(prev, content());
    expect(next.spaces).toBe(prev.spaces);
    expect(next.favorites).toBe(prev.favorites);
    expect(next.tabs).toBe(prev.tabs);
    expect(next.collapsedFolders).toBe(prev.collapsedFolders);
  });

  it('replaces only the path to what changed', () => {
    const prev = content();
    const changed = content();
    const folder = changed.spaces[0]!.pinned[1]!;
    if (folder.kind !== 'folder') throw new Error('fixture');
    folder.children = [{ kind: 'pin', id: 'p2', title: 'B renamed', url: 'https://b', tabId: undefined }];
    const next = reuseContent(prev, changed);

    expect(next.spaces).not.toBe(prev.spaces);
    const [work, home] = next.spaces as [Space, Space];
    expect(work).not.toBe(prev.spaces[0]);
    expect(work.pinned[0]).toBe(prev.spaces[0]!.pinned[0]);
    expect(work.pinned[1]).not.toBe(prev.spaces[0]!.pinned[1]);
    expect(work.tabIds).toBe(prev.spaces[0]!.tabIds);
    expect(home).toBe(prev.spaces[1]);
    expect(next.favorites).toBe(prev.favorites);
  });

  it('keeps unchanged tabs and replaces the one that changed', () => {
    const prev = content();
    const changed = content();
    const tabs = new Map(changed.tabs);
    tabs.set(2, { ...tabs.get(2)!, status: 'complete' });
    const next = reuseContent(prev, { ...changed, tabs });
    expect(next.tabs).not.toBe(prev.tabs);
    expect(next.tabs.get(1)).toBe(prev.tabs.get(1));
    expect(next.tabs.get(2)).toEqual({ id: 2, title: 'Two', url: 'https://two', status: 'complete' });
  });

  it('notices tabs added, removed or reordered', () => {
    const prev = content();
    const reordered = new Map([...content().tabs].reverse());
    expect(reuseContent(prev, { ...content(), tabs: reordered }).tabs).not.toBe(prev.tabs);
    const fewer = new Map([...content().tabs].slice(0, 1));
    expect(reuseContent(prev, { ...content(), tabs: fewer }).tabs).not.toBe(prev.tabs);
  });

  it('notices a pin becoming a folder, a moved tab and a new collapsed folder', () => {
    const prev = content();
    const changed = content();
    changed.spaces[0]!.pinned[0] = { kind: 'folder', id: 'p1', title: 'A', children: [] };
    changed.spaces[1]!.tabIds = [3, 2];
    changed.collapsedFolders = new Set(['f1', 'f2']);
    const next = reuseContent(prev, changed);
    expect(next.spaces[0]!.pinned[0]).toEqual({ kind: 'folder', id: 'p1', title: 'A', children: [] });
    expect(next.spaces[1]!.tabIds).toEqual([3, 2]);
    expect(next.collapsedFolders).toBe(changed.collapsedFolders);
  });

  it('compares own keys, not just values', () => {
    const prev = content();
    const changed = content();
    changed.favorites = [{ id: 'fav', title: 'Mail', url: 'https://mail' }];
    expect(reuseContent(prev, changed).favorites[0]).not.toBe(prev.favorites[0]);
  });
});
