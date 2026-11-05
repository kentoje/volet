<script lang="ts">
  import { Volume2 } from '@lucide/svelte';
  import { getSidebar } from '@/lib/model/context';
  import Favicon from './Favicon.svelte';

  const sidebar = getSidebar();
</script>

{#if sidebar.favorites.length}
  <ul class="grid grid-cols-4 gap-1.5 px-2.5 pt-2.5 @md:grid-cols-6" aria-label="Favorites">
    {#each sidebar.favorites as favorite (favorite.id)}
      {@const tab = favorite.tabId !== undefined ? sidebar.tabs.get(favorite.tabId) : undefined}
      {@const active = tab !== undefined && tab.id === sidebar.activeTabId}
      <li>
        <button
          type="button"
          class={[
            'relative grid h-11 w-full place-items-center rounded-xl transition-[background-color,box-shadow] duration-100',
            active ? 'bg-pill shadow-(--pill-shadow)' : 'bg-tile hover:bg-pill',
          ]}
          aria-label={favorite.title}
          aria-current={active ? 'page' : undefined}
          title={tab?.title ?? favorite.title}
          onclick={() => sidebar.openFavorite(favorite.id)}
        >
          <span class={['transition-opacity', !tab && 'opacity-70']}>
            <Favicon url={favorite.url} size={20} />
          </span>
          {#if tab?.audible && !tab.muted}
            <span class="absolute right-1 bottom-1 text-ink-muted" aria-label="Playing audio">
              <Volume2 size={11} strokeWidth={2.25} />
            </span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
{/if}
