<script lang="ts">
  import { getSidebar } from '@/lib/model/context';
  import FavoriteTile from '../primitives/FavoriteTile.svelte';

  const sidebar = getSidebar();
</script>

{#if sidebar.favorites.length}
  <ul class="grid grid-cols-4 gap-1.5 px-2.5 pt-2.5 @md:grid-cols-6" aria-label="Favorites">
    {#each sidebar.favorites as favorite (favorite.id)}
      {@const tab = favorite.tabId !== undefined ? sidebar.tabs.get(favorite.tabId) : undefined}
      <li>
        <FavoriteTile
          label={favorite.title}
          url={favorite.url}
          title={tab?.title}
          active={tab !== undefined && tab.id === sidebar.activeTabId}
          open={tab !== undefined}
          playing={tab?.audible && !tab.muted}
          onclick={() => sidebar.openFavorite(favorite.id)}
        />
      </li>
    {/each}
  </ul>
{/if}
