<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { getSidebar } from '@/lib/model/context';
  import type { Favorite } from '@/lib/model/types';
  import TabRow from '../primitives/TabRow.svelte';

  /** A favorite shown as a row, while it's being dragged into a list. */
  let { favorite, depth = 0, handle }: { favorite: Favorite; depth?: number; handle?: Attachment<HTMLElement> } = $props();

  const sidebar = getSidebar();
  const tab = $derived(favorite.tabId !== undefined ? sidebar.tabs.get(favorite.tabId) : undefined);
</script>

<TabRow
  title={tab?.title ?? favorite.title}
  url={tab?.url ?? favorite.url}
  icon={tab?.favIconUrl}
  active={tab !== undefined && tab.id === sidebar.activeTabId}
  {depth}
  {handle}
  buttons={{ shown: 0, onHover: 0 }}
  onactivate={() => sidebar.openFavorite(favorite.id)}
/>
