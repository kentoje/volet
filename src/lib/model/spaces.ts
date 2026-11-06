/**
 * How many Spaces a sidebar holds. Their dots must fit the switcher in a narrow panel, and each one
 * gets its own default hue (there are eight).
 */
export const MAX_SPACES = 8;

/** How many more Spaces fit next to `count` existing ones. */
export const roomForSpaces = (count: number): number => Math.max(0, MAX_SPACES - count);
