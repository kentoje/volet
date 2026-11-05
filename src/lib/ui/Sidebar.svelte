<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import { setSidebar } from '@/lib/model/context';
  import type { SidebarStore } from '@/lib/model/types';
  import FavoritesGrid from './FavoritesGrid.svelte';
  import SpacePage from './SpacePage.svelte';
  import SpaceSwitcher from './SpaceSwitcher.svelte';
  import { SpaceSwipe, hueDelta } from './swipe.svelte';

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
  const index = $derived(Math.max(0, sidebar.spaces.findIndex((space) => space.id === sidebar.activeSpaceId)));

  const swipe = new SpaceSwipe({
    canGo: (direction) => sidebar.spaces[index + direction] !== undefined,
    onCommit: (direction) => {
      const target = sidebar.spaces[index + direction];
      if (target) sidebar.switchSpace(target.id);
    },
  });

  // Hues are kept "unwrapped" (e.g. 400 instead of 40) so the CSS transition
  // always takes the short way around the color wheel. Seeded once from the initial Space.
  // svelte-ignore state_referenced_locally
  let previousHue = sidebar.spaces[index]?.hue ?? 268;
  const baseHue = $derived.by(() => {
    const hue = previousHue + hueDelta(previousHue, sidebar.spaces[index]?.hue ?? previousHue);
    previousHue = hue;
    return hue;
  });

  /** While swiping, the tint blends toward the neighbor Space in proportion to the drag. */
  const hue = $derived.by(() => {
    if (!swipe.dragging) return baseHue;
    const progress = swipe.progress;
    const neighbor = sidebar.spaces[index + Math.sign(progress)];
    if (!neighbor) return baseHue;
    return baseHue + hueDelta(baseHue, neighbor.hue) * Math.min(1, Math.abs(progress));
  });
</script>

<div
  class="sidebar @container relative flex h-full flex-col overflow-hidden select-none"
  data-scheme={scheme ?? (prefersDark.current ? 'dark' : 'light')}
  data-swiping={swipe.dragging}
  style:--space-hue={hue}
  bind:clientWidth={swipe.width}
  {@attach swipe.attach}
>
  <FavoritesGrid />

  <div class="relative min-h-0 flex-1 overflow-hidden">
    <div
      class={[
        'flex h-full',
        !swipe.dragging && 'transition-transform duration-[460ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
      ]}
      style:transform="translateX(calc({-index * 100}% + {swipe.offset}px))"
    >
      {#each sidebar.spaces as space (space.id)}
        {@const current = space.id === sidebar.activeSpaceId}
        <section
          class="h-full w-full flex-none overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--rule)_transparent]"
          aria-label={space.name}
          aria-hidden={!current}
          inert={!current}
        >
          <SpacePage {space} />
        </section>
      {/each}
    </div>
  </div>

  <SpaceSwitcher />
</div>
