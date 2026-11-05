<script lang="ts">
  import { Folder, FolderOpen } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';

  interface Props {
    title: string;
    open: boolean;
    depth?: number;
    ontoggle: () => void;
    ondblclick?: () => void;
    /** Attached to the button (e.g. to make it a drag handle). */
    handle?: Attachment<HTMLElement>;
    /** Replaces the title with an editor (e.g. a rename field); the row stops being a button meanwhile. */
    editor?: Snippet;
  }

  let { title, open, depth = 0, ontoggle, ondblclick, handle, editor }: Props = $props();

  const rowClass =
    'flex h-[34px] w-full items-center gap-2.5 rounded-[10px] pr-3 pl-[calc(10px+var(--depth)*16px)] text-left text-[13px] transition-colors duration-100 hover:bg-hover';
</script>

{#snippet icon()}
  <span class="grid size-4 flex-none place-items-center text-ink-muted">
    {#if open}
      <FolderOpen size={15} strokeWidth={1.75} />
    {:else}
      <Folder size={15} strokeWidth={1.75} />
    {/if}
  </span>
{/snippet}

{#if editor}
  <div class={rowClass} style:--depth={depth}>
    {@render icon()}
    {@render editor()}
  </div>
{:else}
  <button
    type="button"
    class={rowClass}
    style:--depth={depth}
    aria-expanded={open}
    onclick={ontoggle}
    {ondblclick}
    {@attach handle}
  >
    {@render icon()}
    <span class="truncate">{title}</span>
  </button>
{/if}
