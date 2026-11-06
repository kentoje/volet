<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { getSidebar } from '@/lib/model/context';
  import type { Entry } from '@/lib/model/dnd';
  import type { TabId } from '@/lib/model/types';
  import { findPin } from '@/lib/state/tree';
  import { getDrag } from './drag/context';
  import FavoriteTile from '../primitives/FavoriteTile.svelte';
  import ContextMenu from '../primitives/menu/ContextMenu.svelte';
  import { favoriteMenu } from './menus/favorite-menu';
  import { getMenuContext } from './menus/menu-context';

  /**
   * Renders any draggable entry as a favorites tile (mid-drag, a tab can be in the grid). Right
   * after a drop, an entry the store already changed shows as it was (see `DragState.kept`).
   */
  let { entry, handle }: { entry: Entry; handle?: Attachment<HTMLElement> } = $props();

  const sidebar = getSidebar();
  const drag = getDrag();
  const menus = getMenuContext();
  const tabOf = (id: TabId | undefined) => (id === undefined ? undefined : drag.find((content) => content.tabs.get(id)));
  const favorite = $derived(
    entry.kind === 'favorite' ? drag.find((content) => content.favorites.find((f) => f.id === entry.id)) : undefined,
  );

  const tile = $derived.by(() => {
    if (entry.kind === 'favorite') {
      if (!favorite) return undefined;
      const { id, title, url, tabId } = favorite;
      return { label: title, url, tab: tabOf(tabId), open: () => sidebar.openFavorite(id) };
    }
    const pin = entry.kind === 'node' ? drag.find((content) => findPin(content.spaces, entry.id)) : undefined;
    const tab = tabOf(entry.kind === 'tab' ? entry.id : pin?.tabId);
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
