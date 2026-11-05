<script lang="ts">
  import type { Snippet } from 'svelte';
  import { type Entry, entryKey, pinsList } from '@/lib/model/dnd';
  import type { PinnedNode } from '@/lib/model/types';
  import { getDrag } from './drag/context';
  import DropZone from './drag/DropZone.svelte';
  import SortableEntry from './drag/SortableEntry.svelte';
  import EntryRow from './EntryRow.svelte';

  interface Props {
    /** The Space (top level) or folder these pins live in. */
    parentId: string;
    nodes: PinnedNode[];
    depth?: number;
    /** Shown when the list is empty. */
    empty?: Snippet;
  }

  let { parentId, nodes, depth = 0, empty }: Props = $props();

  const drag = getDrag();
  const list = $derived(pinsList(parentId));
  const entries = $derived(drag.entries(list, () => nodes.map((node): Entry => ({ kind: 'node', id: node.id }))));
</script>

<DropZone {list} {depth}>
  <ul class="flex flex-col gap-0.5">
    {#each entries as entry, index (entryKey(entry))}
      <SortableEntry {entry} {list} {index} {depth}>
        {#snippet children(handle)}
          <EntryRow {entry} {depth} {handle} />
        {/snippet}
      </SortableEntry>
    {/each}
  </ul>
  {#if entries.length === 0}
    {@render empty?.()}
  {/if}
</DropZone>
