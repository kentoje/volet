import { describe, expect, it } from 'vitest';
import { MAX_SPACES, roomForSpaces } from './spaces';

describe('roomForSpaces', () => {
  it('counts the Spaces that still fit', () => {
    expect(roomForSpaces(1)).toBe(MAX_SPACES - 1);
    expect(roomForSpaces(MAX_SPACES - 1)).toBe(1);
  });

  it('is zero when full, even past the limit', () => {
    expect(roomForSpaces(MAX_SPACES)).toBe(0);
    expect(roomForSpaces(MAX_SPACES + 4)).toBe(0);
  });
});
