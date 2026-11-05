<script lang="ts">
  import { type Entry, entryKey, tempList } from '@/lib/model/dnd';
  import type { Space } from '@/lib/model/types';
  import { getDrag } from './drag/context';
  import DropZone from './drag/DropZone.svelte';
  import SortableEntry from './drag/SortableEntry.svelte';
  import EntryRow from './EntryRow.svelte';

  let { space }: { space: Space } = $props();

  const drag = getDrag();
  const list = $derived(tempList(space.id));
  const entries = $derived(drag.entries(list, () => space.tabIds.map((id): Entry => ({ kind: 'tab', id }))));
</script>

<DropZone {list} class="min-h-2">
  <ul class="flex flex-col gap-px">
    {#each entries as entry, index (entryKey(entry))}
      <SortableEntry {entry} {list} {index}>
        {#snippet children(handle)}
          <EntryRow {entry} {handle} />
        {/snippet}
      </SortableEntry>
    {/each}
  </ul>
</DropZone>
