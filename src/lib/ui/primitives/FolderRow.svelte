<script lang="ts">
  import { Folder, FolderOpen } from '@lucide/svelte';

  interface Props {
    title: string;
    open: boolean;
    depth?: number;
    ontoggle: () => void;
  }

  let { title, open, depth = 0, ontoggle }: Props = $props();
</script>

<button
  type="button"
  class="flex h-[34px] w-full items-center gap-2.5 rounded-[10px] pr-3 pl-[calc(10px+var(--depth)*16px)] text-left text-[13px] transition-colors duration-100 hover:bg-hover"
  style:--depth={depth}
  aria-expanded={open}
  onclick={ontoggle}
>
  <span class="grid size-4 flex-none place-items-center text-ink-muted">
    {#if open}
      <FolderOpen size={15} strokeWidth={1.75} />
    {:else}
      <Folder size={15} strokeWidth={1.75} />
    {/if}
  </span>
  <span class="truncate">{title}</span>
</button>
