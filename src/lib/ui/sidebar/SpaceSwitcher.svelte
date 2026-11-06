<script lang="ts">
  import { Plus, Search } from '@lucide/svelte';
  import { getArcClient } from '@/lib/model/arc';
  import { getSidebar } from '@/lib/model/context';
  import IconButton from '../primitives/IconButton.svelte';
  import ContextMenu from '../primitives/menu/ContextMenu.svelte';
  import DropdownMenu from '../primitives/menu/DropdownMenu.svelte';
  import { reveal, scrollStrip } from '../primitives/scroll-strip';
  import SpaceDot from '../primitives/SpaceDot.svelte';
  import Tooltip from '../primitives/tooltip/Tooltip.svelte';
  import TooltipGroup from '../primitives/tooltip/TooltipGroup.svelte';
  import { getSpaceOrder } from './drag/context';
  import SortableSpaceDot from './drag/SortableSpaceDot.svelte';
  import { getMenuContext } from './menus/menu-context';
  import { newVoletMenu } from './menus/new-volet-menu';
  import { spaceMenu } from './menus/space-menu';
  import { getPanelPalette } from './palette/panel-palette-state.svelte';

  const sidebar = getSidebar();
  const menus = getMenuContext();
  const palette = getPanelPalette();
  const order = getSpaceOrder();
  const arc = getArcClient();

  /** Keeps the active Space's dot in view: at once when the panel opens, then gliding. */
  let shown = false;
  function showActive(node: HTMLElement) {
    const cleanup = reveal(node, `[data-space-dot="${CSS.escape(sidebar.activeSpaceId)}"]`, shown);
    shown = true;
    return cleanup;
  }
</script>

<nav class="flex h-11 flex-none items-center gap-2 px-2.5" aria-label="Volets">
  <!-- Both buttons take the same room, so the dots stay centered between them. -->
  <div class="w-6 flex-none">
    {#if palette}
      <IconButton label="Search tabs and pins (⌘K)" onclick={() => palette.show()}>
        <Search size={15} strokeWidth={2} />
      </IconButton>
    {/if}
  </div>
  <!-- One tooltip for all the dots: it glides to the hovered one. The dots touch (no gap)
       so the pointer goes straight from one to the next and the tooltip never closes between.
       Dots narrow from 28px to 20px to fit; past that, the row scrolls. -->
  <TooltipGroup>
    <ul
      class="scroll-strip flex h-full min-w-0 flex-1 items-center justify-center-safe overflow-x-auto [container-type:inline-size] *:w-[clamp(20px,calc(100cqi/var(--dots)),28px)] *:flex-none"
      style:--dots={sidebar.spaces.length}
      {@attach scrollStrip}
      {@attach showActive}
    >
      <!-- Drag a dot to reorder the Spaces; drop a tab on one to move it there. -->
      {#each order.ordered(sidebar.spaces) as space, index (space.id)}
        <SortableSpaceDot spaceId={space.id} {index}>
          {#snippet children({ highlighted, handle })}
            <ContextMenu items={() => spaceMenu(space, menus)}>
              <Tooltip label={space.name}>
                {#snippet trigger(props)}
                  <SpaceDot
                    {...props}
                    data-space-dot={space.id}
                    name={space.name}
                    hue={space.hue}
                    active={space.id === sidebar.activeSpaceId}
                    {highlighted}
                    {handle}
                    onclick={() => sidebar.switchSpace(space.id)}
                  />
                {/snippet}
              </Tooltip>
            </ContextMenu>
          {/snippet}
        </SortableSpaceDot>
      {/each}
    </ul>
  </TooltipGroup>
  <div class="w-6 flex-none">
    <!-- While Arc Spaces are left to import, the button offers them next to a blank Volet. -->
    {#if arc?.offers.length}
      <DropdownMenu items={() => newVoletMenu(sidebar, arc)}>
        {#snippet trigger(props)}
          <IconButton {...props} label="New Volet">
            <Plus size={16} strokeWidth={2} />
          </IconButton>
        {/snippet}
      </DropdownMenu>
    {:else}
      <IconButton label="New Volet" onclick={() => sidebar.createSpace()}>
        <Plus size={16} strokeWidth={2} />
      </IconButton>
    {/if}
  </div>
</nav>
