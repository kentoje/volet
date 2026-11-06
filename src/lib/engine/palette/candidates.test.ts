import { describe, expect, it } from 'vitest';
import { MAX_SPACES } from '../../model/spaces';
import { type CandidateInput, candidates } from './candidates';

const input = (spaceCount: number): CandidateInput => ({
  tabs: [],
  spaces: Array.from({ length: spaceCount }, (_, i) => ({
    id: `s${i}`,
    title: `Volet ${i + 1}`,
    hue: 268,
    node: { id: `s${i}`, title: `Volet ${i + 1}`, children: [] },
  })),
  activeSpaceId: 's0',
  favoritesFolder: undefined,
  archive: [],
});

const actions = (spaceCount: number) =>
  candidates(input(spaceCount))
    .filter((item) => item.kind === 'action')
    .map((item) => item.ref);

describe('candidates', () => {
  it('offers a new Space while there is room', () => {
    expect(actions(MAX_SPACES - 1)).toContain('new-space');
  });

  it('stops offering a new Space once full, and keeps the other actions', () => {
    expect(actions(MAX_SPACES)).not.toContain('new-space');
    expect(actions(MAX_SPACES)).toContain('new-tab');
  });
});
