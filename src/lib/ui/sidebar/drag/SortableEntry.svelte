<script lang="ts">
  import { Feedback } from '@dnd-kit/dom';
  import { SortableKeyboardPlugin } from '@dnd-kit/dom/sortable';
  import { createSortable } from '@dnd-kit/svelte/sortable';
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { type Entry, type ListId, entryKey } from '@/lib/model/dnd';
  import { type DragData, getDrag, priority, sensors } from './context';

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
    sensors,
    // Svelte owns the DOM: lists reorder from state, so dnd-kit's DOM-moving sorting stays off,
    // and the row stays put (ghosted) while a clone of it follows the pointer.
    plugins: [SortableKeyboardPlugin, Feedback.configure({ feedback: 'clone' })],
  });

  // The row's own button is the handle, so dnd-kit's button semantics land on a real button.
  const handle: Attachment<HTMLElement> = (node) => sortable.attachHandle(node);
</script>

<svelte:element
  this={tag}
  class={['transition-opacity', drag.isActive(entry) && 'opacity-35']}
  {@attach sortable.attach}
>
  {@render children(handle)}
</svelte:element>
