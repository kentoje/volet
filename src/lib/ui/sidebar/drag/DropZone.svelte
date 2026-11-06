<script lang="ts">
  import { pointerIntersection } from '@dnd-kit/collision';
  import { createDroppable } from '@dnd-kit/svelte';
  import type { Snippet } from 'svelte';
  import type { ListId } from '@/lib/model/dnd';
  import DropLine from '../../primitives/DropLine.svelte';
  import { type DragData, getDrag, notSpaceDot, priority } from './context';

  interface Props {
    list: ListId;
    depth?: number;
    /** How the list lays out its entries: rows (`y`) or a grid of tiles (`x`). */
    axis?: 'x' | 'y';
    /**
     * How the list shows it would take a drop while empty: it lights up (`fill`, for lists that
     * show a hint when empty), or a drop line marks its top, where the row will go (`line`).
     */
    empty?: 'fill' | 'line';
    class?: string;
    children: Snippet;
  }

  let { list, depth = 0, axis = 'y', empty = 'fill', class: className = '', children }: Props = $props();

  const drag = getDrag();
  const droppable = createDroppable({
    get id() {
      return `list:${list}`;
    },
    get data(): DragData {
      return { kind: 'list', list, axis };
    },
    get collisionPriority() {
      return priority.list(depth);
    },
    accept: notSpaceDot,
    collisionDetector: pointerIntersection,
  });
</script>

<!--
  A list's whole area accepts drops: over a gap or past the last row, the drop goes next to
  the closest row. Empty, the list lights up (or shows a drop line) when something would land in it.
-->
<div
  class={[
    'rounded-[10px] transition-colors',
    empty === 'line' && 'relative',
    empty === 'fill' && drag.fills(list) && 'bg-hover',
    className,
  ]}
  {@attach droppable.attach}
>
  {@render children()}
  {#if empty === 'line' && drag.fills(list)}
    <DropLine side="before" {axis} {depth} />
  {/if}
</div>
