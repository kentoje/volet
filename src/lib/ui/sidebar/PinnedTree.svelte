<script lang="ts">
  import { prefersReducedMotion } from 'svelte/motion';
  import { slide } from 'svelte/transition';
  import { getSidebar } from '@/lib/model/context';
  import { activePinsIn } from '@/lib/model/pinned';
  import type { PinnedNode } from '@/lib/model/types';
  import FolderRow from '../primitives/FolderRow.svelte';
  import PinnedTree from './PinnedTree.svelte';
  import PinRow from './PinRow.svelte';

  let { nodes, depth = 0 }: { nodes: PinnedNode[]; depth?: number } = $props();

  const sidebar = getSidebar();
  const duration = $derived(prefersReducedMotion.current ? 0 : 160);
</script>

<ul class="flex flex-col gap-px">
  {#each nodes as node (node.id)}
    <li>
      {#if node.kind === 'folder'}
        {@const open = !sidebar.collapsedFolders.has(node.id)}
        <FolderRow title={node.title} {open} {depth} ontoggle={() => sidebar.toggleFolder(node.id)} />
        {#if open}
          <div transition:slide={{ duration }}>
            <PinnedTree nodes={node.children} depth={depth + 1} />
          </div>
        {:else}
          {@const visible = activePinsIn(node.children, sidebar.activeTabId)}
          {#if visible.length}
            <PinnedTree nodes={visible} depth={depth + 1} />
          {/if}
        {/if}
      {:else}
        <PinRow pin={node} {depth} />
      {/if}
    </li>
  {/each}
</ul>
