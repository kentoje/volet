<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import { getSidebar } from '@/lib/model/context';
  import type { Space } from '@/lib/model/types';
  import ListActionButton from '../primitives/ListActionButton.svelte';
  import SectionDivider from '../primitives/SectionDivider.svelte';
  import PinnedSection from './PinnedSection.svelte';
  import SpaceHeader from './SpaceHeader.svelte';
  import TemporaryTabs from './TemporaryTabs.svelte';

  let { space }: { space: Space } = $props();

  const sidebar = getSidebar();
  const clear = $derived(
    space.tabIds.length > 0
      ? {
          label: 'Clear',
          description: `Close all unpinned tabs in ${space.name}`,
          onclick: () => sidebar.clearTemporary(space.id),
        }
      : undefined,
  );
</script>

<div class="flex min-h-full flex-col px-2.5 pt-3 pb-4">
  <SpaceHeader {space} />
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
