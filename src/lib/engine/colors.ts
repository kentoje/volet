import type { SpaceMeta } from './schema';

/** Hues given to Spaces that have no saved color, in order. */
const DEFAULT_HUES = [268, 152, 42, 330, 205, 100, 15, 295];

export function defaultHue(index: number): number {
  return DEFAULT_HUES[index % DEFAULT_HUES.length]!;
}

/** A Space's hue: its saved color (colors are kept by name), else the default for its place. */
export function spaceHue(meta: Record<string, SpaceMeta>, title: string | undefined, index: number): number {
  return (title !== undefined ? meta[title]?.hue : undefined) ?? defaultHue(Math.max(0, index));
}

/** Next hue for a new Space: step around the wheel by the golden angle from the last one. */
export function nextHue(existing: number[]): number {
  if (existing.length === 0) return DEFAULT_HUES[0]!;
  return Math.round((existing.at(-1)! + 137.5) % 360);
}

/** Swatches offered in the Space color picker. */
export const HUE_SWATCHES = [268, 295, 330, 15, 42, 100, 152, 205];

type GroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange';

/** Approximate OKLCH hue of each Chrome tab group color. */
const GROUP_HUES: [GroupColor, number][] = [
  ['red', 25],
  ['orange', 55],
  ['yellow', 95],
  ['green', 145],
  ['cyan', 200],
  ['blue', 255],
  ['purple', 300],
  ['pink', 350],
];

/** Closest Chrome tab group color for a Space hue, so the top strip roughly matches. */
export function groupColorFor(hue: number): GroupColor {
  let best: GroupColor = 'grey';
  let bestDistance = Infinity;
  for (const [color, groupHue] of GROUP_HUES) {
    const raw = Math.abs((((hue - groupHue) % 360) + 360) % 360);
    const distance = Math.min(raw, 360 - raw);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = color;
    }
  }
  return best;
}
