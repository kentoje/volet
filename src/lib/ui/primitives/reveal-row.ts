import type { Attachment } from 'svelte/attachments';
import { prefersReducedMotion } from 'svelte/motion';

/** Room left between a revealed row and the edge of its list, in px. */
const MARGIN = 8;

interface Edges {
  top: number;
  bottom: number;
}

/**
 * How far to scroll so a row shows fully in its scroller, with some room (0 when it already
 * shows fully). Positions are viewport y coordinates, as `getBoundingClientRect` gives them.
 */
export function revealDelta(view: Edges, row: Edges, margin = MARGIN): number {
  if (row.top < view.top) return row.top - view.top - margin;
  if (row.bottom > view.bottom) return row.bottom - view.bottom + margin;
  return 0;
}

/** The nearest ancestor that scrolls vertically (a page of the sidebar). */
function scroller(node: HTMLElement): HTMLElement | undefined {
  for (let element = node.parentElement; element; element = element.parentElement) {
    const { overflowY } = getComputedStyle(element);
    if (overflowY === 'auto' || overflowY === 'scroll') return element;
  }
  return undefined;
}

/**
 * Attachment: bring the row into view in its list, gliding (a new tab at the bottom of a long
 * list, a tab picked in Chrome's tab strip). Only that list scrolls: `scrollIntoView` would also
 * move the overflow-hidden strip the pages slide in.
 */
export const revealRow: Attachment<HTMLElement> = (node) => {
  // Next frame: the row has its place by then.
  const frame = requestAnimationFrame(() => {
    const view = scroller(node);
    if (!view) return;
    const delta = revealDelta(view.getBoundingClientRect(), node.getBoundingClientRect());
    if (delta) view.scrollBy({ top: delta, behavior: prefersReducedMotion.current ? 'instant' : 'smooth' });
  });
  return () => cancelAnimationFrame(frame);
};
