<script lang="ts">
  import { createDroppable } from '@dnd-kit/svelte';
  import type { Snippet } from 'svelte';
  import type { ListId } from '@/lib/model/dnd';
  import { type DragData, notSpaceDot, priority } from './context';

  interface Props {
    list: ListId;
    depth?: number;
    class?: string;
    children: Snippet;
  }

  let { list, depth = 0, class: className = '', children }: Props = $props();

  const droppable = createDroppable({
    get id() {
      return `list:${list}`;
    },
    get data(): DragData {
      return { kind: 'list', list };
    },
    get collisionPriority() {
      return priority.list(depth);
    },
    accept: notSpaceDot,
  });
</script>

<!-- A list's whole area accepts drops (its empty space appends to the end). -->
<div
  class={['rounded-[10px] transition-colors', droppable.isDropTarget && 'bg-hover', className]}
  {@attach droppable.attach}
>
  {@render children()}
</div>
