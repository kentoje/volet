<script lang="ts">
  import type { Snippet } from 'svelte';
  import { type Entry, entryKey, tempList } from '@/lib/model/dnd';
  import type { Space } from '@/lib/model/types';
  import { getDrag } from './drag/context';
  import DropZone from './drag/DropZone.svelte';
  import SortableEntry from './drag/SortableEntry.svelte';
  import EntryRow from './EntryRow.svelte';

  /** `footer` sits below the tabs, inside the drop zone (dropped on it, a row goes last). */
  let { space, footer }: { space: Space; footer?: Snippet } = $props();

  const drag = getDrag();
  const list = $derived(tempList(space.id));
  const entries = $derived(drag.entries(list, () => space.tabIds.map((id): Entry => ({ kind: 'tab', id }))));
</script>

<!-- Empty, there's no hint to light up: a drop line shows where the tab will go. -->
<DropZone {list} empty="line" class="flex flex-col gap-0.5">
  <ul class="flex min-h-2 flex-col gap-0.5">
    {#each entries as entry, index (entryKey(entry))}
      <SortableEntry {entry} {list} {index}>
        {#snippet children(handle)}
          <EntryRow {entry} {handle} />
        {/snippet}
      </SortableEntry>
    {/each}
  </ul>
  {@render footer?.()}
</DropZone>
