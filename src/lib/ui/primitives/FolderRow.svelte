<script lang="ts">
  import { Folder, FolderOpen } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';

  interface Props {
    title: string;
    open: boolean;
    /** Part of a multi-row selection. */
    selected?: boolean;
    /** Something dragged over it would drop into it: it shows its hover state. */
    dropTarget?: boolean;
    depth?: number;
    /** A click on the row (the event tells whether a modifier key was held). */
    ontoggle: (event: MouseEvent) => void;
    ondblclick?: () => void;
    /** Attached to the button (e.g. to make it a drag handle). */
    handle?: Attachment<HTMLElement>;
    /** Replaces the title with an editor (e.g. a rename field); the row stops being a button meanwhile. */
    editor?: Snippet;
  }

  let { title, open, selected = false, dropTarget = false, depth = 0, ontoggle, ondblclick, handle, editor }: Props =
    $props();

  const rowClass = $derived([
    'flex h-[34px] w-full items-center gap-2.5 rounded-[10px] pr-3 pl-[calc(10px+var(--depth)*16px)] text-left text-[13px] transition-colors duration-100',
    selected ? 'bg-selected' : dropTarget ? 'bg-hover' : 'hover:bg-hover data-hovered:bg-hover',
  ]);
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
  <div class={rowClass} style:--depth={depth} data-row>
    {@render icon()}
    {@render editor()}
  </div>
{:else}
  <button
    type="button"
    class={rowClass}
    style:--depth={depth}
    data-selected={selected || undefined}
    data-row
    aria-expanded={open}
    onclick={ontoggle}
    {ondblclick}
    {@attach handle}
  >
    {@render icon()}
    <span class="truncate">{title}</span>
  </button>
{/if}
