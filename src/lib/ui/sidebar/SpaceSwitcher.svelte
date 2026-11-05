<script lang="ts">
  import { Plus, Search } from '@lucide/svelte';
  import { getSidebar } from '@/lib/model/context';
  import IconButton from '../primitives/IconButton.svelte';
  import ContextMenu from '../primitives/menu/ContextMenu.svelte';
  import SpaceDot from '../primitives/SpaceDot.svelte';
  import SpaceDropTarget from './drag/SpaceDropTarget.svelte';
  import { getMenuContext } from './menus/menu-context';
  import { spaceMenu } from './menus/space-menu';
  import { getPanelPalette } from './palette/panel-palette-state.svelte';

  const sidebar = getSidebar();
  const menus = getMenuContext();
  const palette = getPanelPalette();
</script>

<nav class="relative flex h-11 flex-none items-center px-2.5" aria-label="Spaces">
  {#if palette}
    <div class="absolute left-2.5">
      <IconButton label="Search tabs and pins (⌘K)" onclick={() => palette.show()}>
        <Search size={15} strokeWidth={2} />
      </IconButton>
    </div>
  {/if}
  <ul class="flex flex-1 items-center justify-center gap-0.5">
    {#each sidebar.spaces as space (space.id)}
      <li>
        <SpaceDropTarget spaceId={space.id}>
          {#snippet children(highlighted)}
            <ContextMenu items={() => spaceMenu(space, menus)}>
              <SpaceDot
                name={space.name}
                hue={space.hue}
                active={space.id === sidebar.activeSpaceId}
                {highlighted}
                onclick={() => sidebar.switchSpace(space.id)}
              />
            </ContextMenu>
          {/snippet}
        </SpaceDropTarget>
      </li>
    {/each}
  </ul>
  <div class="absolute right-2.5">
    <IconButton label="New Space" onclick={() => sidebar.createSpace()}>
      <Plus size={16} strokeWidth={2} />
    </IconButton>
  </div>
</nav>
