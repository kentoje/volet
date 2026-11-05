import { describe, expect, it } from 'vitest';
import { MENU_PLACEMENT } from './placement';

describe('placements', () => {
  it('open menus below the pointer so they can slide sideways to fit', () => {
    expect(MENU_PLACEMENT).toMatchObject({ side: 'bottom', sticky: 'always', avoidCollisions: true });
  });
});
