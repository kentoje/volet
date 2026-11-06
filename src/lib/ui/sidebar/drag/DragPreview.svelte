<script lang="ts">
  import { Portal } from 'bits-ui';
  import type { Attachment } from 'svelte/attachments';
  import { prefersReducedMotion } from 'svelte/motion';
  import { type Entry, entryKey } from '@/lib/model/dnd';
  import DragStack from '../../primitives/DragStack.svelte';
  import { OVERLAY_ROOT } from '../../primitives/overlay';
  import { previewSpot, previewWidth, rowCopy } from './drag-preview';

  interface Props {
    /** The dragged entry: the card shows a copy of its row. */
    entry: Entry;
    /** How many entries the drag carries (the card shows a stack and a count past one). */
    count: number;
    /** The pointer, in viewport coordinates. */
    pointer: { x: number; y: number };
  }

  let { entry, count, pointer }: Props = $props();

  // Copied once, when the drag starts.
  // svelte-ignore state_referenced_locally
  const copy = rowCopy(entryKey(entry));
  const width = previewWidth(copy?.rect.width ?? 0);
  const spot = $derived(previewSpot(pointer, width));

  /** Shown in the top layer (above everything, placed against the viewport), lifting off its row. */
  const lift: Attachment<HTMLElement> = (node) => {
    if (copy) node.append(copy.node);
    node.showPopover();
    if (!copy || prefersReducedMotion.current) return;
    const from = copy.rect;
    node.animate(
      [
        { transform: `translate(${from.left - spot.x}px, ${from.top - spot.y}px) scaleX(${from.width / width})` },
        { transform: 'none' },
      ],
      { duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
  };
</script>

<Portal to={OVERLAY_ROOT}>
  <div
    popover="manual"
    data-drag-preview
    aria-hidden="true"
    inert
    class="pointer-events-none fixed isolate m-0 h-[34px] origin-top-left overflow-visible border-0 bg-transparent p-0 text-ink top-0 right-auto bottom-auto left-0"
    style:width="{width}px"
    style:translate="{spot.x}px {spot.y}px"
    {@attach lift}
  >
    <DragStack {count} />
  </div>
</Portal>
