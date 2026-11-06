/**
 * The card that follows the pointer while dragging (DOM only). It hangs just below the
 * pointer, so the row under the pointer stays visible, with its drop line or lit-up folder.
 */

type Point = { x: number; y: number };

/** Where the card's corner sits from the pointer: just below it, starting a little to its left. */
const OFFSET: Point = { x: -14, y: 18 };
const MAX_WIDTH = 224;
/** The closest it gets to the panel's sides. */
const EDGE = 6;

/** A copy of an entry's row (its main button: icon and title), and where the row is. */
export function rowCopy(key: string): { node: HTMLElement; rect: DOMRect } | undefined {
  const row = document.querySelector<HTMLElement>(`[data-entry="${CSS.escape(key)}"] [data-drag-row]`);
  if (!row) return undefined;
  const node = row.cloneNode(true) as HTMLElement;
  for (const element of [node, ...node.querySelectorAll('[id]')]) element.removeAttribute('id');
  node.removeAttribute('title');
  node.removeAttribute('data-drag-row');
  // Laid out on its own: no indent, and no room kept for the row's buttons.
  for (const [name, value] of [['--depth', '0'], ['--room', '12px'], ['--room-hover', '12px']]) {
    node.style.setProperty(name!, value!);
  }
  return { node, rect: row.getBoundingClientRect() };
}

export const previewWidth = (rowWidth: number) => Math.min(rowWidth, MAX_WIDTH);

/** Where the card's top-left corner goes for `pointer` (viewport coordinates). */
export function previewSpot(pointer: Point, width: number): Point {
  const x = Math.min(Math.max(pointer.x + OFFSET.x, EDGE), window.innerWidth - width - EDGE);
  return { x, y: pointer.y + OFFSET.y };
}
