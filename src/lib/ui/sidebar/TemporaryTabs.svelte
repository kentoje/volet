<script lang="ts">
  import { flip } from 'svelte/animate';
  import { prefersReducedMotion } from 'svelte/motion';
  import { slide } from 'svelte/transition';
  import { getSidebar } from '@/lib/model/context';
  import type { LiveTab, Space } from '@/lib/model/types';
  import TemporaryTabRow from './TemporaryTabRow.svelte';

  let { space }: { space: Space } = $props();

  const sidebar = getSidebar();
  const duration = $derived(prefersReducedMotion.current ? 0 : 160);
  const tabs = $derived(
    space.tabIds.map((id) => sidebar.tabs.get(id)).filter((tab): tab is LiveTab => tab !== undefined),
  );
</script>

<ul class="flex flex-col gap-px">
  {#each tabs as tab (tab.id)}
    <li animate:flip={{ duration }} transition:slide={{ duration }}>
      <TemporaryTabRow {tab} />
    </li>
  {/each}
</ul>
