import { describe, expect, it } from 'vitest';
import { ArcImportError, parseArcSidebar } from './arc';
import { rgbToHue } from './color';

/** A small file in Arc's format: two Spaces, a nested folder, and favorites. */
const arcFile = {
  version: 1,
  sidebar: {
    containers: [
      { global: {} },
      {
        topAppsContainerIDs: [{ default: true }, 'top'],
        spaces: [
          'S1',
          {
            id: 'S1',
            title: 'Work',
            containerIDs: ['pinned', 'P1', 'unpinned', 'U1'],
            customInfo: { windowTheme: { primaryColorPalette: { midTone: { red: 0.45, green: 0.38, blue: 0.95 } } } },
          },
          'S2',
          { id: 'S2', title: '', containerIDs: ['pinned', 'P2', 'unpinned', 'U2'] },
        ],
        items: [
          'P1',
          { id: 'P1', childrenIds: ['t1', 'f1'], data: { itemContainer: {} } },
          't1',
          { id: 't1', title: null, childrenIds: [], data: { tab: { savedURL: 'https://linear.app', savedTitle: 'Linear' } } },
          'f1',
          { id: 'f1', title: 'Docs', childrenIds: ['t2', 'f2'], data: { list: {} } },
          't2',
          { id: 't2', title: 'Wiki', childrenIds: [], data: { tab: { savedURL: 'https://wiki.example', savedTitle: 'Home · Wiki' } } },
          'f2',
          { id: 'f2', title: 'Old', childrenIds: [], data: { list: {} } },
          'U1',
          { id: 'U1', childrenIds: ['t3'], data: { itemContainer: {} } },
          't3',
          { id: 't3', childrenIds: [], data: { tab: { savedURL: 'https://temporary.example', savedTitle: 'Temp' } } },
          'P2',
          { id: 'P2', childrenIds: [], data: { itemContainer: {} } },
          'top',
          { id: 'top', childrenIds: ['t4'], data: { itemContainer: {} } },
          't4',
          { id: 't4', childrenIds: [], data: { tab: { savedURL: 'https://mail.example', savedTitle: 'Mail' } } },
        ],
      },
    ],
  },
};

describe('parseArcSidebar', () => {
  it('reads Spaces with their pinned tree, colors, and favorites', () => {
    const result = parseArcSidebar(arcFile);
    expect(result.favorites).toEqual([{ title: 'Mail', url: 'https://mail.example' }]);
    expect(result.spaces).toHaveLength(2);
    const [work, untitled] = result.spaces;
    expect(work!.name).toBe('Work');
    expect(work!.hue).toBeGreaterThan(260);
    expect(work!.hue).toBeLessThan(300);
    expect(work!.pinned).toEqual([
      { kind: 'pin', title: 'Linear', url: 'https://linear.app' },
      {
        kind: 'folder',
        title: 'Docs',
        children: [
          { kind: 'pin', title: 'Wiki', url: 'https://wiki.example', named: true }, // renamed in Arc
          { kind: 'folder', title: 'Old', children: [] },
        ],
      },
    ]);
    expect(work!.id).toBe('S1');
    expect(untitled).toEqual({ id: 'S2', name: 'Volet', hue: undefined, pinned: [] });
  });

  it('skips the unpinned (temporary) tabs', () => {
    const urls = JSON.stringify(parseArcSidebar(arcFile));
    expect(urls).not.toContain('temporary.example');
  });

  it('rejects files that are not Arc sidebars', () => {
    expect(() => parseArcSidebar({ hello: 'world' })).toThrow(ArcImportError);
  });
});

describe('rgbToHue', () => {
  it('finds familiar hues and ignores greys', () => {
    expect(rgbToHue(1, 0, 0)).toBe(29);
    expect(rgbToHue(0, 0.6, 0.2)).toBeGreaterThan(130);
    expect(rgbToHue(0.5, 0.5, 0.5)).toBeUndefined();
  });
});
