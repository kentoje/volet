import { FAVORITES_TITLE } from './schema';

/** `wanted`, or `wanted 2`, `wanted 3`... so Space names stay unique (they key Space colors). */
/** A new Space's name: `wanted` if given, else the next "Volet n", made unique among `taken`. */
export function newSpaceName(wanted: string | undefined, taken: string[]): string {
  return uniqueName(wanted?.trim() || `Volet ${taken.length + 1}`, taken);
}

export function uniqueName(wanted: string, taken: Iterable<string>): string {
  const used = new Set([...taken, FAVORITES_TITLE]);
  if (!used.has(wanted)) return wanted;
  for (let n = 2; ; n++) if (!used.has(`${wanted} ${n}`)) return `${wanted} ${n}`;
}
