<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import type { Entry } from '@/lib/model/dnd';
  import { findNode } from '@/lib/state/tree';
  import { getDrag } from './drag/context';
  import FavoriteRow from './FavoriteRow.svelte';
  import PinnedFolder from './PinnedFolder.svelte';
  import PinRow from './PinRow.svelte';
  import TemporaryTabRow from './TemporaryTabRow.svelte';

  interface Props {
    entry: Entry;
    depth?: number;
    /** Inside a collapsed folder (see `PinnedList`). */
    folded?: boolean;
    handle?: Attachment<HTMLElement>;
  }

  /**
   * Renders any draggable entry as a row (mid-drag, a list can hold any kind). Right after a drop,
   * an entry the store already changed shows as it was (see `DragState.kept`).
   */
  let { entry, depth = 0, folded = false, handle }: Props = $props();

  const drag = getDrag();
  const tab = $derived(entry.kind === 'tab' ? drag.find((content) => content.tabs.get(entry.id)) : undefined);
  const node = $derived(entry.kind === 'node' ? drag.find((content) => findNode(content.spaces, entry.id)) : undefined);
  const favorite = $derived(
    entry.kind === 'favorite' ? drag.find((content) => content.favorites.find((f) => f.id === entry.id)) : undefined,
  );
</script>

{#if tab}
  <TemporaryTabRow {tab} {depth} {handle} />
{:else if node?.kind === 'pin'}
  <PinRow pin={node} {depth} {handle} />
{:else if node?.kind === 'folder'}
  <PinnedFolder folder={node} {depth} {folded} {handle} />
{:else if favorite}
  <FavoriteRow {favorite} {depth} {handle} />
{/if}
