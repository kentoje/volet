<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    name: string;
    /** Starts renaming (a click on the name; the Space menu offers "Rename Volet" too). */
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
    <!-- The name is editable in place: a text cursor says so, and a click starts renaming. -->
    <button
      type="button"
      class="block w-full cursor-text truncate rounded-md text-left"
      onclick={onrename}
    >
      {name}
    </button>
  {/if}
</h2>
