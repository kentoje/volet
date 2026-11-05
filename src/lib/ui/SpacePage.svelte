<script lang="ts">
  import { Plus, Volume2, VolumeX, X } from '@lucide/svelte';
  import { flip } from 'svelte/animate';
  import { prefersReducedMotion } from 'svelte/motion';
  import { slide } from 'svelte/transition';
  import { getSidebar } from '@/lib/model/context';
  import type { LiveTab, Space } from '@/lib/model/types';
  import IconButton from './IconButton.svelte';
  import PinnedTree from './PinnedTree.svelte';
  import TabRow from './TabRow.svelte';

  let { space }: { space: Space } = $props();

  const sidebar = getSidebar();
  const duration = $derived(prefersReducedMotion.current ? 0 : 160);
  const tabs = $derived(
    space.tabIds.map((id) => sidebar.tabs.get(id)).filter((tab): tab is LiveTab => tab !== undefined),
  );
</script>

<div class="flex min-h-full flex-col px-2.5 pt-3 pb-4">
  <h2 class="px-2.5 pb-2 font-display text-[19px] leading-tight font-bold tracking-[-0.01em]">
    {space.name}
  </h2>

  {#if space.pinned.length}
    <PinnedTree nodes={space.pinned} />
  {:else}
    <p class="mx-1 rounded-[10px] border border-dashed border-rule px-3 py-3 text-[12px] text-ink-muted">
      Drag tabs here to pin them to {space.name}.
    </p>
  {/if}

  <div class="group/divider relative my-2 flex h-5 items-center px-2.5">
    <span class="h-px flex-1 bg-rule"></span>
    {#if tabs.length}
      <button
        type="button"
        class="absolute right-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-ink-muted opacity-0 transition-opacity duration-100 group-hover/divider:opacity-100 hover:bg-hover hover:text-ink focus-visible:opacity-100"
        title="Close all unpinned tabs in {space.name}"
        onclick={() => sidebar.clearTemporary(space.id)}
      >
        Clear
      </button>
    {/if}
  </div>

  <ul class="flex flex-col gap-px">
    {#each tabs as tab (tab.id)}
      <li animate:flip={{ duration }} transition:slide={{ duration }}>
        <TabRow
          title={tab.title}
          url={tab.url}
          active={tab.id === sidebar.activeTabId}
          loading={tab.status === 'loading'}
          onactivate={() => sidebar.activateTab(tab.id)}
        >
          {#snippet trailing()}
            {#if tab.audible}
              <IconButton label={tab.muted ? 'Unmute tab' : 'Mute tab'} onclick={() => sidebar.toggleMute(tab.id)}>
                {#if tab.muted}<VolumeX size={14} />{:else}<Volume2 size={14} />{/if}
              </IconButton>
            {/if}
            <IconButton label="Close tab" reveal onclick={() => sidebar.closeTab(tab.id)}>
              <X size={14} strokeWidth={2.25} />
            </IconButton>
          {/snippet}
        </TabRow>
      </li>
    {/each}
  </ul>

  <button
    type="button"
    class="mt-px flex h-[34px] w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[13px] text-ink-muted transition-colors duration-100 hover:bg-hover hover:text-ink"
    onclick={() => sidebar.newTab()}
  >
    <span class="grid size-4 place-items-center"><Plus size={15} strokeWidth={2} /></span>
    New tab
  </button>
</div>
