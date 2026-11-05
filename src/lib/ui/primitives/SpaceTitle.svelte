<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    name: string;
    /** Starts renaming (double-click on the title). */
    onrename?: () => void;
    /** Replaces the name with an editor (e.g. a rename field). */
    editor?: Snippet;
  }

  let { name, onrename, editor }: Props = $props();
</script>

<h2 class="px-2.5 pb-2 font-display text-[19px] leading-tight font-bold tracking-[-0.01em]">
  {#if editor}
    {@render editor()}
  {:else}
    <!-- The name is a button so renaming by double-click is also reachable by keyboard (Enter). -->
    <button type="button" class="max-w-full truncate text-left" title="Rename Space" ondblclick={onrename} onkeydown={(event) => event.key === 'Enter' && onrename?.()}>
      {name}
    </button>
  {/if}
</h2>
