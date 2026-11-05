<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import { getSidebar } from '@/lib/model/context';
  import IconButton from '../primitives/IconButton.svelte';
  import SpaceDot from '../primitives/SpaceDot.svelte';

  const sidebar = getSidebar();
</script>

<nav class="relative flex h-11 flex-none items-center px-2.5" aria-label="Spaces">
  <ul class="flex flex-1 items-center justify-center gap-0.5">
    {#each sidebar.spaces as space (space.id)}
      <li>
        <SpaceDot
          name={space.name}
          hue={space.hue}
          active={space.id === sidebar.activeSpaceId}
          onclick={() => sidebar.switchSpace(space.id)}
        />
      </li>
    {/each}
  </ul>
  <div class="absolute right-2.5">
    <IconButton label="New Space" onclick={() => sidebar.createSpace()}>
      <Plus size={16} strokeWidth={2} />
    </IconButton>
  </div>
</nav>
