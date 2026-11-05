<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { getSidebar } from '@/lib/model/context';
  import type { Entry } from '@/lib/model/dnd';
  import { findPin } from '@/lib/state/tree';
  import FavoriteTile from '../primitives/FavoriteTile.svelte';

  /** Renders any draggable entry as a favorites tile (mid-drag, a tab can be in the grid). */
  let { entry, handle }: { entry: Entry; handle?: Attachment<HTMLElement> } = $props();

  const sidebar = getSidebar();

  const tile = $derived.by(() => {
    if (entry.kind === 'favorite') {
      const favorite = sidebar.favorites.find((f) => f.id === entry.id);
      if (!favorite) return undefined;
      const tab = favorite.tabId !== undefined ? sidebar.tabs.get(favorite.tabId) : undefined;
      return { label: favorite.title, url: favorite.url, tab, open: () => sidebar.openFavorite(favorite.id) };
    }
    const pin = entry.kind === 'node' ? findPin(sidebar.spaces, entry.id) : undefined;
    const tabId = entry.kind === 'tab' ? entry.id : pin?.tabId;
    const tab = tabId !== undefined ? sidebar.tabs.get(tabId) : undefined;
    return tab && { label: tab.title, url: tab.url, tab, open: () => sidebar.activateTab(tab.id) };
  });
</script>

{#if tile}
  <FavoriteTile
    label={tile.label}
    url={tile.url}
    title={tile.tab?.title}
    active={tile.tab !== undefined && tile.tab.id === sidebar.activeTabId}
    open={tile.tab !== undefined}
    playing={tile.tab?.audible && !tile.tab.muted}
    onclick={tile.open}
    {handle}
  />
{/if}
