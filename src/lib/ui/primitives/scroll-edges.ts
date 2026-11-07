import type { Attachment } from 'svelte/attachments';

/**
 * Attachment for a vertical scroller, to draw its edges:
 * - `data-scrolled` while it isn't at the top,
 * - `data-overflows` while its content is taller than it (it has a scrollbar).
 */
export const scrollEdges: Attachment<HTMLElement> = (node) => {
  const update = () => {
    node.toggleAttribute('data-scrolled', node.scrollTop > 0);
    node.toggleAttribute('data-overflows', node.scrollHeight > node.clientHeight + 1);
  };
  update();
  node.addEventListener('scroll', update, { passive: true });
  // The scroller resizes with the panel, its content as rows come and go.
  const resized = new ResizeObserver(update);
  resized.observe(node);
  for (const child of node.children) resized.observe(child);
  return () => {
    node.removeEventListener('scroll', update);
    resized.disconnect();
  };
};
