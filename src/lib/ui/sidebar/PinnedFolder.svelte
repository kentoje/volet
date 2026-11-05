<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { prefersReducedMotion } from 'svelte/motion';
  import { slide } from 'svelte/transition';
  import { activePinsIn } from '@/lib/model/pinned';
  import type { Folder } from '@/lib/model/types';
  import FolderRow from '../primitives/FolderRow.svelte';
  import ContextMenu from '../primitives/menu/ContextMenu.svelte';
  import RenameField from '../primitives/RenameField.svelte';
  import { folderMenu } from './menus/folder-menu';
  import { getMenuContext } from './menus/menu-context';
  import PinnedList from './PinnedList.svelte';
  import PinRow from './PinRow.svelte';

  let { folder, depth = 0, handle }: { folder: Folder; depth?: number; handle?: Attachment<HTMLElement> } = $props();

  const menus = getMenuContext();
  const { store: sidebar, rename } = menus;
  const open = $derived(!sidebar.collapsedFolders.has(folder.id));
  const duration = $derived(prefersReducedMotion.current ? 0 : 160);
  /** Arc behavior: a collapsed folder still shows the tab you're on. */
  const visible = $derived(open ? [] : activePinsIn(folder.children, sidebar.activeTabId));
</script>

{#snippet editor()}
  <RenameField
    value={folder.title}
    label="Folder name"
    oncommit={(title) => {
      rename.stop();
      void sidebar.renameNode(folder.id, title);
    }}
    oncancel={() => rename.stop()}
  />
{/snippet}

<ContextMenu items={() => folderMenu(folder, menus)}>
  <FolderRow
    title={folder.title}
    {open}
    {depth}
    {handle}
    editor={rename.is(folder.id) ? editor : undefined}
    ontoggle={() => sidebar.toggleFolder(folder.id)}
    ondblclick={() => rename.start(folder.id)}
  />
</ContextMenu>
<!-- The same 2px row gap separates the folder from its contents. -->
{#if open}
  <div class="pt-0.5" transition:slide={{ duration }}>
    <PinnedList parentId={folder.id} nodes={folder.children} depth={depth + 1}>
      {#snippet empty()}
        <p class="py-1.5 pl-[calc(36px+var(--depth)*16px)] text-[12px] text-ink-muted" style:--depth={depth}>
          Empty folder
        </p>
      {/snippet}
    </PinnedList>
  </div>
{:else if visible.length}
  <div class="flex flex-col gap-0.5 pt-0.5">
    {#each visible as pin (pin.id)}
      <PinRow {pin} depth={depth + 1} />
    {/each}
  </div>
{/if}
