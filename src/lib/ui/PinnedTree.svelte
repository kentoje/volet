<script lang="ts">
  import { Folder, FolderOpen } from '@lucide/svelte';
  import { slide } from 'svelte/transition';
  import { prefersReducedMotion } from 'svelte/motion';
  import { getSidebar } from '@/lib/model/context';
  import type { Pin, PinnedNode } from '@/lib/model/types';
  import PinnedTree from './PinnedTree.svelte';
  import PinRow from './PinRow.svelte';

  let { nodes, depth = 0 }: { nodes: PinnedNode[]; depth?: number } = $props();

  const sidebar = getSidebar();
  const duration = $derived(prefersReducedMotion.current ? 0 : 160);

  /** Arc behavior: a collapsed folder still shows the tab you're on. */
  function activePins(children: PinnedNode[]): Pin[] {
    return children.flatMap((node) =>
      node.kind === 'folder'
        ? activePins(node.children)
        : node.tabId !== undefined && node.tabId === sidebar.activeTabId
          ? [node]
          : [],
    );
  }
</script>

<ul class="flex flex-col gap-px">
  {#each nodes as node (node.id)}
    <li>
      {#if node.kind === 'folder'}
        {@const open = !sidebar.collapsedFolders.has(node.id)}
        <button
          type="button"
          class="flex h-[34px] w-full items-center gap-2.5 rounded-[10px] pr-3 pl-[calc(10px+var(--depth)*16px)] text-left text-[13px] transition-colors duration-100 hover:bg-hover"
          style:--depth={depth}
          aria-expanded={open}
          onclick={() => sidebar.toggleFolder(node.id)}
        >
          <span class="grid size-4 flex-none place-items-center text-ink-muted">
            {#if open}
              <FolderOpen size={15} strokeWidth={1.75} />
            {:else}
              <Folder size={15} strokeWidth={1.75} />
            {/if}
          </span>
          <span class="truncate">{node.title}</span>
        </button>
        {#if open}
          <div transition:slide={{ duration }}>
            <PinnedTree nodes={node.children} depth={depth + 1} />
          </div>
        {:else}
          {@const visible = activePins(node.children)}
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
