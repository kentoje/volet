import { describe, expect, it } from 'vitest';
import { derive } from './derive';
import type { BookmarkNode, Snapshot, TabInfo } from './snapshot';

const WINDOW = 1;

function tab(id: number, extra: Partial<TabInfo> = {}): TabInfo {
  return { id, windowId: WINDOW, index: id, title: `Tab ${id}`, url: `https://example.com/${id}`, active: false, pinned: false, groupId: -1, ...extra };
}

const root: BookmarkNode = {
  id: 'root',
  title: 'Spaces',
  children: [
    { id: 'fav', title: 'Favorites', children: [{ id: 'f1', title: 'Mail', url: 'https://mail.example.com' }] },
    {
      id: 'work',
      title: 'Work',
      children: [
        { id: 'p1', title: 'Issues', url: 'https://example.com/issues' },
        { id: 'docs', title: 'Docs', children: [{ id: 'p2', title: 'Wiki', url: 'https://example.com/wiki' }] },
      ],
    },
    { id: 'home', title: 'Home', children: [] },
  ],
};

function snapshot(extra: Partial<Snapshot> = {}): Snapshot {
  return {
    windowId: WINDOW,
    tabs: [],
    groups: [
      { id: 10, windowId: WINDOW, title: 'Work', color: 'purple', collapsed: false },
      { id: 20, windowId: WINDOW, title: 'Home', color: 'green', collapsed: true },
    ],
    root,
    favoritesId: 'fav',
    bindings: {},
    groupSpaces: { 10: 'work', 20: 'home' },
    activeSpaces: { [WINDOW]: 'work' },
    spaceMeta: { Work: { hue: 300 } },
    openFolders: ['docs'],
    ...extra,
  };
}

describe('derive', () => {
  it('lists Spaces from bookmark folders, excluding Favorites', () => {
    const state = derive(snapshot());
    expect(state.spaces.map((space) => space.name)).toEqual(['Work', 'Home']);
    expect(state.spaces[0]!.hue).toBe(300);
    expect(state.spaces[0]!.pinned.map((node) => node.kind)).toEqual(['pin', 'folder']);
    expect(state.openFolders.has('docs')).toBe(true);
  });

  it('puts unbound tabs in the Space of their group, in strip order', () => {
    const state = derive(snapshot({ tabs: [tab(1, { groupId: 20 }), tab(2, { groupId: 10 }), tab(3, { groupId: 10 })] }));
    expect(state.spaces.find((s) => s.id === 'work')!.tabIds).toEqual([2, 3]);
    expect(state.spaces.find((s) => s.id === 'home')!.tabIds).toEqual([1]);
  });

  it('shows ungrouped tabs in the active Space before the engine groups them', () => {
    const state = derive(snapshot({ tabs: [tab(1)] }));
    expect(state.spaces.find((s) => s.id === 'work')!.tabIds).toEqual([1]);
  });

  it('attaches bound tabs to their pin or favorite instead of the temporary list', () => {
    const state = derive(
      snapshot({
        tabs: [tab(1, { groupId: 10 }), tab(2, { pinned: true }), tab(3, { groupId: 10 })],
        bindings: { 1: { kind: 'pin', id: 'p2' }, 2: { kind: 'favorite', id: 'f1' } },
      }),
    );
    const work = state.spaces.find((s) => s.id === 'work')!;
    expect(work.tabIds).toEqual([3]);
    const docs = work.pinned[1]!;
    expect(docs.kind === 'folder' && docs.children[0]).toMatchObject({ id: 'p2', tabId: 1 });
    expect(state.favorites).toEqual([{ id: 'f1', title: 'Mail', url: 'https://mail.example.com', tabId: 2 }]);
  });

  it('treats a binding to a deleted bookmark as a temporary tab', () => {
    const state = derive(snapshot({ tabs: [tab(1, { groupId: 10 })], bindings: { 1: { kind: 'pin', id: 'gone' } } }));
    expect(state.spaces.find((s) => s.id === 'work')!.tabIds).toEqual([1]);
  });

  it('maps groups by title when the session mapping is missing (after a restart)', () => {
    const state = derive(snapshot({ tabs: [tab(1, { groupId: 20 })], groupSpaces: {} }));
    expect(state.spaces.find((s) => s.id === 'home')!.tabIds).toEqual([1]);
  });

  it('falls back to the active tab’s Space, then the first Space', () => {
    expect(derive(snapshot({ activeSpaces: {}, tabs: [tab(1, { groupId: 20, active: true })] })).activeSpaceId).toBe('home');
    expect(derive(snapshot({ activeSpaces: {} })).activeSpaceId).toBe('work');
  });

  it('uses the pending URL while a tab has not committed its first navigation', () => {
    const state = derive(snapshot({ tabs: [tab(1, { url: '', pendingUrl: 'https://pending.example.com', title: '' })] }));
    expect(state.tabs.get(1)).toMatchObject({ url: 'https://pending.example.com', title: 'https://pending.example.com' });
  });
});
