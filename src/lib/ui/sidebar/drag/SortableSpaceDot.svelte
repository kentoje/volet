<script lang="ts">
  import { pointerIntersection } from '@dnd-kit/collision';
  import { Feedback } from '@dnd-kit/dom';
  import { createSortable } from '@dnd-kit/svelte/sortable';
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { type DragData, SPACE_DOT, getSpaceOrder, priority, sensors } from './context';

  interface Props {
    spaceId: string;
    index: number;
    /**
     * `highlighted`: a tab or pin is held over the dot (dropping moves it to this Space).
     * `handle`: attach it to the dot's button; dragging the button reorders the Spaces.
     */
    children: Snippet<[{ highlighted: boolean; handle: Attachment<HTMLElement> }]>;
  }

  let { spaceId, index, children }: Props = $props();

  const order = getSpaceOrder();

  const sortable = createSortable({
    get id() {
      return `space:${spaceId}`;
    },
    get index() {
      return index;
    },
    group: 'spaces',
    type: SPACE_DOT,
    get data(): DragData {
      return { kind: 'space', spaceId };
    },
    collisionPriority: priority.space,
    // Dots are small: only the pointer itself counts, not the dragged row's whole shape.
    collisionDetector: pointerIntersection,
    sensors,
    // As with rows: Svelte owns the DOM, and a clone of the dot follows the pointer.
    plugins: [Feedback.configure({ feedback: 'clone' })],
  });

  const handle: Attachment<HTMLElement> = (node) => sortable.attachHandle(node);
  const highlighted = $derived(sortable.isDropTarget && order.active === undefined);
</script>

<!-- The copy left in place is ghosted; the dot under the pointer (data-dnd-dragging) is not. -->
<li
  class={['transition-opacity', order.isActive(spaceId) && 'opacity-35 data-dnd-dragging:opacity-100']}
  {@attach sortable.attach}
>
  {@render children({ highlighted, handle })}
</li>
