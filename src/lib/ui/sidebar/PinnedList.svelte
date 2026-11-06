<script lang="ts">
  import type { Snippet } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { slide } from 'svelte/transition';
  import { type Entry, entryKey, pinsList } from '@/lib/model/dnd';
  import { hasOpenTab } from '@/lib/model/pinned';
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
    /** Inside a collapsed folder: only the rows with an open tab stay. */
    folded?: boolean;
    /** Shown when the list is empty. */
    empty?: Snippet;
  }

  let { parentId, nodes, depth = 0, folded = false, empty }: Props = $props();

  const drag = getDrag();
  const list = $derived(pinsList(parentId));
  const entries = $derived(drag.entries(list, () => nodes.map((node): Entry => ({ kind: 'node', id: node.id }))));
  const duration = $derived(prefersReducedMotion.current ? 0 : 160);

  /** Rows dragged in from elsewhere always show. */
  function shown(entry: Entry): boolean {
    if (!folded || entry.kind !== 'node') return true;
    const node = nodes.find((candidate) => candidate.id === entry.id);
    return !node || hasOpenTab(node);
  }
</script>

<!--
  Collapsing a folder slides away only the rows that leave (local transitions: rows added or
  removed for any other reason just appear). The 2px row gap is each row's top padding, so it
  slides away with the row; a folder's first row takes it as its gap below the folder.
-->
<DropZone {list} {depth}>
  <ul class="flex flex-col">
    {#each entries as entry, index (entryKey(entry))}
      {#if shown(entry)}
        <li class={depth > 0 ? 'pt-0.5' : 'not-first:pt-0.5'} transition:slide={{ duration }}>
          <SortableEntry tag="div" {entry} {list} {index} {depth}>
            {#snippet children(handle)}
              <EntryRow {entry} {depth} {folded} {handle} />
            {/snippet}
          </SortableEntry>
        </li>
      {/if}
    {/each}
  </ul>
  {#if entries.length === 0 && !folded}
    <div transition:slide={{ duration }}>{@render empty?.()}</div>
  {/if}
</DropZone>
