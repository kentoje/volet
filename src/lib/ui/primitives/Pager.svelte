<script lang="ts" generics="T extends { id: string }">
  import type { Snippet } from 'svelte';
  import { PAGE_SLIDE_MS } from './motion';

  interface Props {
    items: T[];
    activeIndex: number;
    /** Live drag offset in px while a swipe is in progress. */
    offset?: number;
    dragging?: boolean;
    label: (item: T) => string;
    page: Snippet<[T]>;
  }

  let { items, activeIndex, offset = 0, dragging = false, label, page }: Props = $props();

  let previous: { id?: string; index: number } | undefined;
  /** The active page only moved (pages were reordered): jump to it instead of sliding past others. */
  const reordered = $derived.by(() => {
    const id = items[activeIndex]?.id;
    const moved = previous !== undefined && previous.id === id && previous.index !== activeIndex;
    previous = { id, index: activeIndex }; // memory, not state: only compared with the next value
    return moved;
  });
</script>

<!--
  Pages side by side; only the active one is focusable. Slides with an ease, follows drags 1:1.
  A page fills its slot and scrolls (or not) as it likes.
-->
<div class="relative min-h-0 flex-1 overflow-hidden">
  <div
    class={[
      'flex h-full',
      !dragging && !reordered && 'transition-transform ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
    ]}
    style:transition-duration="{PAGE_SLIDE_MS}ms"
    style:transform="translateX(calc({-activeIndex * 100}% + {offset}px))"
  >
    {#each items as item, index (item.id)}
      <section
        class="h-full w-full flex-none overflow-hidden"
        aria-label={label(item)}
        aria-hidden={index !== activeIndex}
        inert={index !== activeIndex}
      >
        {@render page(item)}
      </section>
    {/each}
  </div>
</div>
