/**
 * How every floating menu is placed so it always fits on screen.
 *
 * Floating UI (under Bits UI) only slides a menu along its alignment axis. A menu opened
 * *beside* the pointer can therefore flip left or right but never slide sideways, so in a
 * narrow side panel it ends up cut off. Opening *below* the pointer makes the slide axis
 * horizontal: the menu slides sideways to fit and flips above when there's no room below.
 */
export const MENU_PLACEMENT = {
  side: 'bottom',
  align: 'start',
  sideOffset: 2,
  avoidCollisions: true,
  collisionPadding: 8,
  /** Keep sliding even when that means moving away from the pointer. */
  sticky: 'always',
} as const;

/** Space kept between menus and the panel's edges, in px (matches collisionPadding). */
export const EDGE = MENU_PLACEMENT.collisionPadding;

/** Width a submenu is assumed to need when choosing its side (menus are at least 210px). */
export const SUBMENU_WIDTH = 220;

export type SubmenuSide = 'right' | 'left' | 'bottom';

/**
 * Where a submenu fits next to its item: to the right, else to the left, else below it
 * (a narrow panel has no room for two menus side by side). Pure.
 */
export function submenuSide(
  item: { left: number; right: number },
  viewportWidth: number,
  width = SUBMENU_WIDTH,
): SubmenuSide {
  if (item.right + width + EDGE <= viewportWidth) return 'right';
  if (item.left - width - EDGE >= 0) return 'left';
  return 'bottom';
}

/** Bits UI placement props for a submenu opening on `side`. */
export function submenuPlacement(side: SubmenuSide) {
  return side === 'bottom'
    ? ({ ...MENU_PLACEMENT, side, alignOffset: 12 } as const)
    : ({ ...MENU_PLACEMENT, side, align: 'start', sideOffset: 4, alignOffset: -4 } as const);
}
