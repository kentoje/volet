<script lang="ts">
  import { pointerIntersection } from '@dnd-kit/collision';
  import { Feedback } from '@dnd-kit/dom';
  import { SortableKeyboardPlugin } from '@dnd-kit/dom/sortable';
  import { createSortable } from '@dnd-kit/svelte/sortable';
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { type Entry, type ListId, entryKey } from '@/lib/model/dnd';
  import DropLine from '../../primitives/DropLine.svelte';
  import { type DragData, getDrag, notSpaceDot, priority, sensors } from './context';

  interface Props {
    entry: Entry;
    list: ListId;
    index: number;
    depth?: number;
    /** `li` for row lists, `div` inside grids that already provide list items. */
    tag?: 'li' | 'div';
    /** How entries are laid out: decides whether "after" means below or to the right. */
    axis?: 'x' | 'y';
    /** Receives the attachment for the drag handle: put it on the row's main button. */
    children: Snippet<[Attachment<HTMLElement>]>;
  }

  let { entry, list, index, depth = 0, tag = 'li', axis = 'y', children }: Props = $props();

  const drag = getDrag();
  const data = $derived<DragData>({ kind: 'entry', entry, axis });
  const line = $derived(drag.lineAt(entry));

  const sortable = createSortable({
    get id() {
      return entryKey(entry);
    },
    get index() {
      return index;
    },
    get group() {
      return list;
    },
    get data() {
      return data;
    },
    get collisionPriority() {
      return priority.entry(depth);
    },
    accept: notSpaceDot,
    // Only what is under the pointer counts (the drop line follows the pointer, not the dragged row).
    collisionDetector: pointerIntersection,
    sensors,
    // Svelte owns the DOM: lists change from state, so dnd-kit's DOM-moving sorting stays off.
    // dnd-kit shows nothing either: the row stays put (faded) and DragPreview follows the pointer.
    plugins: [SortableKeyboardPlugin, Feedback.configure({ feedback: 'none' })],
  });

  /**
   * The row's own button is the handle, so dnd-kit's button semantics land on a real button.
   * It is the drop target too: for a folder, the row, not the block with its contents.
   */
  const handle: Attachment<HTMLElement> = (node) => {
    const detachHandle = sortable.attachHandle(node);
    const detachTarget = sortable.attachTarget(node);
    return () => {
      detachHandle();
      detachTarget();
    };
  };
</script>

<!-- The carried rows stay in place, faded, while the drag preview follows the pointer. -->
<svelte:element
  this={tag}
  class={['relative transition-opacity', drag.faded(entry) && 'opacity-35']}
  data-entry={entryKey(entry)}
  data-list={list}
  {@attach sortable.attach}
>
  {@render children(handle)}
  {#if line}
    <DropLine side={line} {axis} {depth} />
  {/if}
</svelte:element>
