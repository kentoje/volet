<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { getSidebar } from '@/lib/model/context';
  import type { Entry } from '@/lib/model/dnd';
  import { findPin } from '@/lib/state/tree';
  import FavoriteTile from '../primitives/FavoriteTile.svelte';
  import ContextMenu from '../primitives/menu/ContextMenu.svelte';
  import { favoriteMenu } from './menus/favorite-menu';
  import { getMenuContext } from './menus/menu-context';

  /** Renders any draggable entry as a favorites tile (mid-drag, a tab can be in the grid). */
  let { entry, handle }: { entry: Entry; handle?: Attachment<HTMLElement> } = $props();

  const sidebar = getSidebar();
  const menus = getMenuContext();
  const favorite = $derived(entry.kind === 'favorite' ? sidebar.favorites.find((f) => f.id === entry.id) : undefined);

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

{#snippet tileView(view: NonNullable<typeof tile>)}
  <FavoriteTile
    label={view.label}
    url={view.url}
    icon={view.tab?.favIconUrl}
    title={view.tab?.title}
    active={view.tab !== undefined && view.tab.id === sidebar.activeTabId}
    open={view.tab !== undefined}
    playing={view.tab?.audible && !view.tab.muted}
    onclick={view.open}
    {handle}
  />
{/snippet}

{#if tile && favorite}
  <ContextMenu items={() => favoriteMenu(favorite, menus)}>
    {@render tileView(tile)}
  </ContextMenu>
{:else if tile}
  {@render tileView(tile)}
{/if}
