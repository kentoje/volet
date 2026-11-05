<script lang="ts">
  import { type Entry, FAVORITES_LIST, entryKey } from '@/lib/model/dnd';
  import { getSidebar } from '@/lib/model/context';
  import { getDrag } from './drag/context';
  import DropZone from './drag/DropZone.svelte';
  import SortableEntry from './drag/SortableEntry.svelte';
  import EntryTile from './EntryTile.svelte';

  const sidebar = getSidebar();
  const drag = getDrag();
  const entries = $derived(
    drag.entries(FAVORITES_LIST, () => sidebar.favorites.map((f): Entry => ({ kind: 'favorite', id: f.id }))),
  );
</script>

<!-- Always a drop target, even when empty, so tabs can be dragged up to become favorites. -->
<DropZone list={FAVORITES_LIST} class={['mx-2.5 mt-2.5', entries.length === 0 && 'min-h-3'].filter(Boolean).join(' ')}>
  {#if entries.length}
    <ul class="grid grid-cols-4 gap-1.5 @md:grid-cols-6" aria-label="Favorites">
      {#each entries as entry, index (entryKey(entry))}
        <SortableEntry {entry} list={FAVORITES_LIST} {index} axis="x">
          {#snippet children(handle)}
            <EntryTile {entry} {handle} />
          {/snippet}
        </SortableEntry>
      {/each}
    </ul>
  {/if}
</DropZone>
