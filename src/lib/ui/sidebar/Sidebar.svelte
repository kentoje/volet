<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import { MediaQuery } from 'svelte/reactivity';
  import { setSidebar } from '@/lib/model/context';
  import type { PaletteClient } from '@/lib/model/palette';
  import type { SidebarStore } from '@/lib/model/types';
  import Pager from '../primitives/Pager.svelte';
  import DragLayer from './drag/DragLayer.svelte';
  import ConfirmHost from './editing/ConfirmHost.svelte';
  import { ConfirmState } from './editing/confirm-state.svelte';
  import { setConfirm, setRename } from './editing/context';
  import { RenameState } from './editing/rename-state.svelte';
  import FavoritesGrid from './FavoritesGrid.svelte';
  import { PanelPaletteState, setPanelPalette } from './palette/panel-palette-state.svelte';
  import PanelPalette from './palette/PanelPalette.svelte';
  import SelectionDismiss from './selection/SelectionDismiss.svelte';
  import { Selection, setSelection } from './selection/selection.svelte';
  import SpacePage from './SpacePage.svelte';
  import SpaceSwitcher from './SpaceSwitcher.svelte';
  import { SpaceSwipe } from './space-swipe.svelte';
  import { SpaceTint } from './space-tint.svelte';

  interface Props {
    store: SidebarStore;
    /** Enables search (the bottom bar button, ⌘K, and the shortcut's side panel fallback). */
    palette?: PaletteClient;
    /** Force a color scheme (the prototype uses this); defaults to the system's. */
    scheme?: 'light' | 'dark';
  }

  let { store, palette, scheme }: Props = $props();

  // The store is created once at mount and never replaced.
  // svelte-ignore state_referenced_locally
  const sidebar = setSidebar(store);
  setRename(new RenameState());
  setConfirm(new ConfirmState());
  setSelection(new Selection(sidebar));
  // svelte-ignore state_referenced_locally
  const panelPalette = setPanelPalette(palette ? new PanelPaletteState() : undefined);

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
  <!-- Tooltips appear right away and close as soon as the pointer leaves their trigger, so they
       never stand in the way (they fade in and out, see .tooltip-surface). -->
  <Tooltip.Provider delayDuration={0} disableHoverableContent>
    <DragLayer store={sidebar}>
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
      <ConfirmHost />
      <SelectionDismiss />
      {#if palette && panelPalette}
        <PanelPalette client={palette} state={panelPalette} />
      {/if}
    </DragLayer>
  </Tooltip.Provider>
  <!-- Menus, tooltips and dialogs render here, inside the tint. -->
  <div data-overlay-root></div>
</div>
