<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import { setSidebar } from '@/lib/model/context';
  import type { SidebarStore } from '@/lib/model/types';
  import Pager from '../primitives/Pager.svelte';
  import FavoritesGrid from './FavoritesGrid.svelte';
  import SpacePage from './SpacePage.svelte';
  import SpaceSwitcher from './SpaceSwitcher.svelte';
  import { SpaceSwipe } from './space-swipe.svelte';
  import { SpaceTint } from './space-tint.svelte';

  interface Props {
    store: SidebarStore;
    /** Force a color scheme (the prototype uses this); defaults to the system's. */
    scheme?: 'light' | 'dark';
  }

  let { store, scheme }: Props = $props();

  // The store is created once at mount and never replaced.
  // svelte-ignore state_referenced_locally
  const sidebar = setSidebar(store);

  const prefersDark = new MediaQuery('(prefers-color-scheme: dark)');
  const activeIndex = $derived(Math.max(0, sidebar.spaces.findIndex((space) => space.id === sidebar.activeSpaceId)));

  const swipe = new SpaceSwipe({
    canGo: (direction) => sidebar.spaces[activeIndex + direction] !== undefined,
    onCommit: (direction) => {
      const target = sidebar.spaces[activeIndex + direction];
      if (target) sidebar.switchSpace(target.id);
    },
  });
  const tint = new SpaceTint({ spaces: () => sidebar.spaces, activeIndex: () => activeIndex, swipe });
</script>

<div
  class="sidebar @container relative flex h-full flex-col overflow-hidden select-none"
  data-scheme={scheme ?? (prefersDark.current ? 'dark' : 'light')}
  data-swiping={swipe.dragging}
  style:--space-hue={tint.hue}
  bind:clientWidth={swipe.width}
  {@attach swipe.attach}
>
  <FavoritesGrid />
  <Pager
    items={sidebar.spaces}
    {activeIndex}
    offset={swipe.offset}
    dragging={swipe.dragging}
    label={(space) => space.name}
  >
    {#snippet page(space)}
      <SpacePage {space} />
    {/snippet}
  </Pager>
  <SpaceSwitcher />
</div>
