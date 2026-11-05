<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    onclick: () => void;
    /** The leading icon. */
    icon: Snippet;
  }

  let { label, onclick, icon }: Props = $props();
</script>

<!-- A row-shaped action at the end of a list, like "New tab". -->
<button
  type="button"
  class="flex h-[34px] w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[13px] text-ink-muted transition-colors duration-100 hover:bg-hover hover:text-ink"
  {onclick}
>
  <span class="grid size-4 place-items-center">{@render icon()}</span>
  {label}
</button>
