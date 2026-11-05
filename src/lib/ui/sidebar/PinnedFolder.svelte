<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { prefersReducedMotion } from 'svelte/motion';
  import { slide } from 'svelte/transition';
  import { getSidebar } from '@/lib/model/context';
  import { activePinsIn } from '@/lib/model/pinned';
  import type { Folder } from '@/lib/model/types';
  import FolderRow from '../primitives/FolderRow.svelte';
  import PinnedList from './PinnedList.svelte';
  import PinRow from './PinRow.svelte';

  let { folder, depth = 0, handle }: { folder: Folder; depth?: number; handle?: Attachment<HTMLElement> } = $props();

  const sidebar = getSidebar();
  const open = $derived(!sidebar.collapsedFolders.has(folder.id));
  const duration = $derived(prefersReducedMotion.current ? 0 : 160);
  /** Arc behavior: a collapsed folder still shows the tab you're on. */
  const visible = $derived(open ? [] : activePinsIn(folder.children, sidebar.activeTabId));
</script>

<FolderRow title={folder.title} {open} {depth} {handle} ontoggle={() => sidebar.toggleFolder(folder.id)} />
{#if open}
  <div transition:slide={{ duration }}>
    <PinnedList parentId={folder.id} nodes={folder.children} depth={depth + 1}>
      {#snippet empty()}
        <p class="py-1.5 pl-[calc(36px+var(--depth)*16px)] text-[12px] text-ink-muted" style:--depth={depth}>
          Empty folder
        </p>
      {/snippet}
    </PinnedList>
  </div>
{:else}
  {#each visible as pin (pin.id)}
    <PinRow {pin} depth={depth + 1} />
  {/each}
{/if}
