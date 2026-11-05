/** Shortest signed distance between two hues, in degrees (-180 to 180). */
export function hueDelta(from: number, to: number): number {
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
