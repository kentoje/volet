/**
 * How every floating menu is placed so it always fits on screen.
 *
 * Floating UI (under Bits UI) only slides a menu along its alignment axis. A menu opened
 * *beside* the pointer can therefore flip left or right but never slide sideways, so in a
 * narrow side panel it ends up cut off. Opening *below* the pointer makes the slide axis
 * horizontal: the menu slides sideways to fit and flips above when there's no room below.
 * (Submenus expand in place, inside their menu: see SubMenu.svelte.)
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

/** Tooltips sit above what they describe, sliding sideways and flipping below to stay on screen. */
export const TOOLTIP_PLACEMENT = {
  side: 'top',
  align: 'center',
  sideOffset: 6,
  avoidCollisions: true,
  collisionPadding: 8,
  sticky: 'always',
} as const;
