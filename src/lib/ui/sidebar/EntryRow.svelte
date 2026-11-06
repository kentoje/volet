<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { getSidebar } from '@/lib/model/context';
  import type { Entry } from '@/lib/model/dnd';
  import { findNode } from '@/lib/state/tree';
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

  /** Renders any draggable entry as a row (mid-drag, a list can hold any kind). */
  let { entry, depth = 0, folded = false, handle }: Props = $props();

  const sidebar = getSidebar();
  const tab = $derived(entry.kind === 'tab' ? sidebar.tabs.get(entry.id) : undefined);
  const node = $derived(entry.kind === 'node' ? findNode(sidebar.spaces, entry.id) : undefined);
  const favorite = $derived(
    entry.kind === 'favorite' ? sidebar.favorites.find((f) => f.id === entry.id) : undefined,
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
