import { describe, expect, it } from 'vitest';
import type { ImportedSidebar } from '../import/types';
import { arcOffers } from './arc';

const sidebar: ImportedSidebar = {
  spaces: [
    { id: 'S1', name: 'Work', hue: 270, pinned: [{ kind: 'pin', title: 'Linear', url: 'https://linear.app' }] },
    {
      id: 'S2',
      name: 'Home',
      pinned: [{ kind: 'folder', title: 'Docs', children: [{ kind: 'pin', title: 'Wiki', url: 'https://w.example' }] }],
    },
    { name: 'No id', pinned: [] },
  ],
  favorites: [],
};

describe('arcOffers', () => {
  it('offers the Spaces not imported yet, with their pin counts', () => {
    expect(arcOffers(sidebar, ['S1'])).toEqual([{ id: 'S2', name: 'Home', hue: undefined, pins: 1 }]);
    expect(arcOffers(sidebar, []).map((offer) => offer.id)).toEqual(['S1', 'S2']);
  });

  it('offers nothing without a remembered file, or once everything is in', () => {
    expect(arcOffers(null, [])).toEqual([]);
    expect(arcOffers(sidebar, ['S1', 'S2'])).toEqual([]);
  });
});
