<script lang="ts">
  import { pointerIntersection } from '@dnd-kit/collision';
  import { createDroppable } from '@dnd-kit/svelte';
  import type { Snippet } from 'svelte';
  import type { ListId } from '@/lib/model/dnd';
  import { type DragData, getDrag, notSpaceDot, priority } from './context';

  interface Props {
    list: ListId;
    depth?: number;
    /** How the list lays out its entries: rows (`y`) or a grid of tiles (`x`). */
    axis?: 'x' | 'y';
    class?: string;
    children: Snippet;
  }

  let { list, depth = 0, axis = 'y', class: className = '', children }: Props = $props();

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
  the closest row. Empty, the list lights up when something would land in it.
-->
<div
  class={['rounded-[10px] transition-colors', drag.fills(list) && 'bg-hover', className]}
  {@attach droppable.attach}
>
  {@render children()}
</div>
