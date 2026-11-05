<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    name: string;
    /** Starts renaming on double-click (a mouse shortcut; the Space menu offers "Rename Space" too). */
    onrename?: () => void;
    /** Replaces the name with an editor (e.g. a rename field). */
    editor?: Snippet;
  }

  let { name, onrename, editor }: Props = $props();
</script>

<h2
  class="truncate px-2.5 pb-2 font-display text-[19px] leading-tight font-bold tracking-[-0.01em]"
  title="Double-click to rename"
  ondblclick={onrename}
>
  {#if editor}{@render editor()}{:else}{name}{/if}
</h2>
