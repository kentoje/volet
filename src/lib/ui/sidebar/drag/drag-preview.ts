/** How see-through the dragged row is, so the drop line and folders show through it (like Arc). */
export const PREVIEW_OPACITY = 0.75;

/** An entry's own row (rows mark their root with `data-row`). It comes first: a folder's contents follow it. */
export const rowOf = (key: string) =>
  document.querySelector<HTMLElement>(`[data-entry="${CSS.escape(key)}"] [data-row]`) ?? undefined;

/** A lookalike of `node` (DOM only), without the ids that must stay unique in the page. */
export function cloneRow(node: HTMLElement): HTMLElement {
  const copy = node.cloneNode(true) as HTMLElement;
  for (const element of [copy, ...copy.querySelectorAll('[id]')]) element.removeAttribute('id');
  return copy;
}

/**
 * The row a drag picks up, copied as it is (DOM only). Rows show their hover look with
 * `data-hovered` (the row was under the pointer).
 */
export function rowCopy(key: string): { node: HTMLElement; rect: DOMRect } | undefined {
  const row = rowOf(key);
  if (!row) return undefined;
  const node = cloneRow(row);
  for (const element of [node, ...node.querySelectorAll('[title]')]) element.removeAttribute('title');
  node.dataset.hovered = '';
  return { node, rect: row.getBoundingClientRect() };
}
