<script lang="ts">
  import { pointerIntersection } from '@dnd-kit/collision';
  import { createDroppable } from '@dnd-kit/svelte';
  import type { Snippet } from 'svelte';
  import { type DragData, priority } from './context';

  /** Dropping on a Space's dot moves the dragged entry into that Space. */
  let { spaceId, children }: { spaceId: string; children: Snippet<[boolean]> } = $props();

  const droppable = createDroppable({
    get id() {
      return `space:${spaceId}`;
    },
    get data(): DragData {
      return { kind: 'space', spaceId };
    },
    collisionPriority: priority.space,
    // Dots are small: only the pointer itself counts, not the dragged row's whole shape.
    collisionDetector: pointerIntersection,
  });
</script>

<div {@attach droppable.attach}>
  {@render children(droppable.isDropTarget)}
</div>
