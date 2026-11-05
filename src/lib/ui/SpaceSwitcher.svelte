<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import { getSidebar } from '@/lib/model/context';

  const sidebar = getSidebar();
</script>

<nav class="relative flex h-11 flex-none items-center gap-1 px-2.5" aria-label="Spaces">
  <ul class="flex flex-1 items-center justify-center gap-0.5">
    {#each sidebar.spaces as space (space.id)}
      {@const active = space.id === sidebar.activeSpaceId}
      <li>
        <button
          type="button"
          class="group/dot grid size-7 place-items-center rounded-lg hover:bg-hover"
          aria-label={space.name}
          aria-current={active ? 'true' : undefined}
          title={space.name}
          onclick={() => sidebar.switchSpace(space.id)}
        >
          <!-- Each dot wears its own Space's color: a preview of where you're going. -->
          <span
            class={[
              'block rounded-full transition-[width,height,box-shadow] duration-200',
              active ? 'size-2.5 shadow-[0_0_0_3px_var(--pill)]' : 'size-[7px] opacity-80 group-hover/dot:opacity-100',
            ]}
            style:background="oklch(var(--dot-l) var(--dot-c) {space.hue})"
          ></span>
        </button>
      </li>
    {/each}
  </ul>
  <button
    type="button"
    class="absolute right-2.5 grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-hover hover:text-ink"
    aria-label="New Space"
    title="New Space"
    onclick={() => sidebar.createSpace()}
  >
    <Plus size={16} strokeWidth={2} />
  </button>
</nav>
