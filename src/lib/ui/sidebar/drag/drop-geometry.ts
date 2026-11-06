import { type Entry, type ListId, type Slot, entryFromKey, entryKey } from '@/lib/model/dnd';

/**
 * Turns the pointer's position into what it points at, from the rows on screen (DOM only).
 * Rows are the `SortableEntry` elements: `data-entry` and `data-list` say what they are.
 */

type Point = { x: number; y: number };
type Box = { left: number; top: number; width: number; height: number };

/** How far along `box` the point is, from 0 (top, or left on the x axis) to 1. */
export function along(box: Box | undefined, point: Point, axis: 'x' | 'y'): number {
  if (!box) return 0.5;
  const t = axis === 'x' ? (point.x - box.left) / box.width : (point.y - box.top) / box.height;
  return Math.min(1, Math.max(0, t));
}

/** A list's own rows (folders inside it have lists of their own). */
const rowsOf = (list: ListId) => document.querySelectorAll<HTMLElement>(`[data-list="${CSS.escape(list)}"]`);

/**
 * Over a list but not over a row (in a gap, or past its last row): the slot next to the
 * closest row. Undefined when the list shows no rows.
 */
export function nearestSlot(list: ListId, point: Point, axis: 'x' | 'y'): Slot | undefined {
  let best: { slot: Slot; distance: number } | undefined;
  for (const node of rowsOf(list)) {
    const box = node.getBoundingClientRect();
    const dx = Math.max(box.left - point.x, 0, point.x - box.right);
    const dy = Math.max(box.top - point.y, 0, point.y - box.bottom);
    // Rows span the list's width, so only height counts; tiles sit in a grid.
    const distance = axis === 'y' ? dy : Math.hypot(dx, dy);
    const past = axis === 'y' ? point.y > box.top + box.height / 2 : point.x > box.left + box.width / 2;
    if (best && distance >= best.distance) continue;
    const slot: Slot = { kind: 'beside', entry: entryFromKey(node.dataset.entry!), side: past ? 'after' : 'before' };
    best = { slot, distance };
  }
  return best?.slot;
}

/** The first row shown inside `entry`'s row block (a folder's first visible row), if any. */
export function firstInside(entry: Entry): Entry | undefined {
  const node = document.querySelector(`[data-entry="${CSS.escape(entryKey(entry))}"]`);
  const inner = node?.querySelector<HTMLElement>('[data-entry]');
  return inner ? entryFromKey(inner.dataset.entry!) : undefined;
}
