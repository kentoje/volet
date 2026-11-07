/** Shortest signed distance between two hues, in degrees (-180 to 180). */
function hueDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/** `to`, expressed as the angle nearest to `from` (e.g. 400 instead of 40), so animations take the short way. */
export function nearestHue(from: number, to: number): number {
  return from + hueDelta(from, to);
}

/** Blend from `from` toward `to` by `amount` (0 to 1), the short way around the wheel. */
export function blendHue(from: number, to: number, amount: number): number {
  return from + hueDelta(from, to) * Math.min(1, Math.max(0, amount));
}

/**
 * A left-to-right CSS gradient through every hue, in the colors Spaces get (the theme's `--dot-l` and `--dot-c`),
 * with a stop every `step` degrees.
 */
export function hueGradient(step = 30): string {
  const stops: string[] = [];
  for (let hue = 0; hue <= 360; hue += step) stops.push(`oklch(var(--dot-l) var(--dot-c) ${hue})`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
