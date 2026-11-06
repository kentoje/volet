<script lang="ts">
  import { Portal } from 'bits-ui';
  import type { Attachment } from 'svelte/attachments';
  import { prefersReducedMotion } from 'svelte/motion';
  import { type Entry, entryKey } from '@/lib/model/dnd';
  import DragStack from '../../primitives/DragStack.svelte';
  import { OVERLAY_ROOT } from '../../primitives/overlay';
  import { PREVIEW_OPACITY, rowCopy } from './drag-preview';

  interface Props {
    /** The dragged entry: the card is a copy of its row, the same size. */
    entry: Entry;
    /** How many entries the drag carries (the card shows a stack and a count past one). */
    count: number;
    /** The pointer, in viewport coordinates. */
    pointer: { x: number; y: number };
  }

  let { entry, count, pointer }: Props = $props();

  // Copied once, when the drag starts, with where the pointer holds it.
  // svelte-ignore state_referenced_locally
  const copy = rowCopy(entryKey(entry));
  // svelte-ignore state_referenced_locally
  const grab = copy ? { x: pointer.x - copy.rect.left, y: pointer.y - copy.rect.top } : { x: 0, y: 0 };

  /** Shown in the top layer (above everything, placed against the viewport), turning see-through. */
  const show: Attachment<HTMLElement> = (node) => {
    if (copy) node.append(copy.node);
    node.showPopover();
    if (!prefersReducedMotion.current) node.animate([{ opacity: 1 }, { opacity: PREVIEW_OPACITY }], { duration: 150 });
  };
</script>

<!--
  The row, picked up as it is: the same size, where the pointer took it, following it. Slightly
  see-through, so the drop line or the folder under it shows.
-->
<Portal to={OVERLAY_ROOT}>
  <div
    popover="manual"
    data-drag-preview
    aria-hidden="true"
    inert
    class="pointer-events-none fixed top-0 right-auto bottom-auto left-0 isolate m-0 overflow-visible border-0 bg-transparent p-0 text-ink"
    style:width="{copy?.rect.width ?? 0}px"
    style:height="{copy?.rect.height ?? 0}px"
    style:opacity={PREVIEW_OPACITY}
    style:translate="{pointer.x - grab.x}px {pointer.y - grab.y}px"
    {@attach show}
  >
    <DragStack {count} />
  </div>
</Portal>
