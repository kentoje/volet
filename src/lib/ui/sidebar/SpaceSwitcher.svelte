<script lang="ts">
  import { Plus, Search } from '@lucide/svelte';
  import { getSidebar } from '@/lib/model/context';
  import IconButton from '../primitives/IconButton.svelte';
  import ContextMenu from '../primitives/menu/ContextMenu.svelte';
  import SpaceDot from '../primitives/SpaceDot.svelte';
  import Tooltip from '../primitives/tooltip/Tooltip.svelte';
  import TooltipGroup from '../primitives/tooltip/TooltipGroup.svelte';
  import { getSpaceOrder } from './drag/context';
  import SortableSpaceDot from './drag/SortableSpaceDot.svelte';
  import { getMenuContext } from './menus/menu-context';
  import { spaceMenu } from './menus/space-menu';
  import { getPanelPalette } from './palette/panel-palette-state.svelte';

  const sidebar = getSidebar();
  const menus = getMenuContext();
  const palette = getPanelPalette();
  const order = getSpaceOrder();
</script>

<nav class="relative flex h-11 flex-none items-center px-2.5" aria-label="Spaces">
  {#if palette}
    <div class="absolute left-2.5">
      <IconButton label="Search tabs and pins (⌘K)" onclick={() => palette.show()}>
        <Search size={15} strokeWidth={2} />
      </IconButton>
    </div>
  {/if}
  <!-- One tooltip for all the dots: it glides to the hovered one. The dots touch (no gap)
       so the pointer goes straight from one to the next and the tooltip never closes between. -->
  <TooltipGroup>
    <ul class="flex flex-1 items-center justify-center">
      <!-- Drag a dot to reorder the Spaces; drop a tab on one to move it there. -->
      {#each order.ordered(sidebar.spaces) as space, index (space.id)}
        <SortableSpaceDot spaceId={space.id} {index}>
          {#snippet children({ highlighted, handle })}
            <ContextMenu items={() => spaceMenu(space, menus)}>
              <Tooltip label={space.name}>
                {#snippet trigger(props)}
                  <SpaceDot
                    {...props}
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
  <div class="absolute right-2.5">
    <IconButton label="New Space" onclick={() => sidebar.createSpace()}>
      <Plus size={16} strokeWidth={2} />
    </IconButton>
  </div>
</nav>
