<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import { getSidebar } from '@/lib/model/context';
  import type { Space } from '@/lib/model/types';
  import { tabsToClear } from '@/lib/state/tree';
  import ListActionButton from '../primitives/ListActionButton.svelte';
  import { scrolled } from '../primitives/scrolled';
  import SectionDivider from '../primitives/SectionDivider.svelte';
  import PinnedSection from './PinnedSection.svelte';
  import SpaceHeader from './SpaceHeader.svelte';
  import TemporaryTabs from './TemporaryTabs.svelte';

  let { space }: { space: Space } = $props();

  const sidebar = getSidebar();
  // The active tab is never cleared, so with only it left there's nothing to clear.
  const keepsActive = $derived(sidebar.activeTabId !== undefined && space.tabIds.includes(sidebar.activeTabId));
  const clear = $derived(
    tabsToClear(space, sidebar.activeTabId).length > 0
      ? {
          label: 'Clear',
          description: keepsActive
            ? `Close the other unpinned tabs in ${space.name}`
            : `Close all unpinned tabs in ${space.name}`,
          onclick: () => sidebar.clearTemporary(space.id),
        }
      : undefined,
  );
</script>

<div class="flex h-full flex-col">
  <!-- The title stays put, like Arc's: the pins and tabs scroll under it, behind a line once scrolled. -->
  <div class="flex-none px-2.5 pt-3">
    <SpaceHeader {space} />
  </div>
  <div
    class="min-h-0 flex-1 overflow-y-auto border-t border-transparent px-2.5 pb-4 transition-colors duration-150 [scrollbar-color:var(--rule)_transparent] [scrollbar-width:thin] data-scrolled:border-rule"
    data-page-scroll
    {@attach scrolled}
  >
    <div class="flex min-h-full flex-col">
      <PinnedSection {space} />
      <SectionDivider action={clear} />
      <!-- "New tab" sits one row gap below the last tab, like any other row. -->
      <TemporaryTabs {space}>
        {#snippet footer()}
          <ListActionButton label="New tab" onclick={() => sidebar.newTab()}>
            {#snippet icon()}
              <Plus size={15} strokeWidth={2} />
            {/snippet}
          </ListActionButton>
        {/snippet}
      </TemporaryTabs>
    </div>
  </div>
</div>
