import { describe, expect, it } from 'vitest';
import { MENU_PLACEMENT, submenuPlacement, submenuSide } from './placement';

describe('submenuSide', () => {
  it('opens to the right when there is room', () => {
    expect(submenuSide({ left: 20, right: 240 }, 800)).toBe('right');
  });

  it('opens to the left when only the left has room', () => {
    expect(submenuSide({ left: 560, right: 780 }, 800)).toBe('left');
  });

  it('drops below its item in a narrow panel', () => {
    expect(submenuSide({ left: 40, right: 260 }, 320)).toBe('bottom');
  });
});

describe('placements', () => {
  it('open menus below the pointer so they can slide sideways to fit', () => {
    expect(MENU_PLACEMENT).toMatchObject({ side: 'bottom', sticky: 'always', avoidCollisions: true });
    expect(submenuPlacement('bottom').side).toBe('bottom');
    expect(submenuPlacement('left')).toMatchObject({ side: 'left', align: 'start' });
  });
});
