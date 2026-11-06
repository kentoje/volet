import type { Attachment } from 'svelte/attachments';

/** Attachment: `data-scrolled` is set on a scroller while it isn't at the top (to draw an edge, say). */
export const scrolled: Attachment<HTMLElement> = (node) => {
  const update = () => node.toggleAttribute('data-scrolled', node.scrollTop > 0);
  update();
  node.addEventListener('scroll', update, { passive: true });
  return () => node.removeEventListener('scroll', update);
};
