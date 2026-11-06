/** How see-through the dragged row is, so the drop line and folders show through it (like Arc). */
export const PREVIEW_OPACITY = 0.75;

/**
 * The row a drag picks up, copied as it is (DOM only). Rows mark their root with `data-row`,
 * and show their hover look with `data-hovered` (the row was under the pointer).
 */
export function rowCopy(key: string): { node: HTMLElement; rect: DOMRect } | undefined {
  // An entry's own row comes first: a folder's contents follow it.
  const row = document.querySelector<HTMLElement>(`[data-entry="${CSS.escape(key)}"] [data-row]`);
  if (!row) return undefined;
  const node = row.cloneNode(true) as HTMLElement;
  for (const element of [node, ...node.querySelectorAll('[id]')]) element.removeAttribute('id');
  for (const element of [node, ...node.querySelectorAll('[title]')]) element.removeAttribute('title');
  node.dataset.hovered = '';
  return { node, rect: row.getBoundingClientRect() };
}
