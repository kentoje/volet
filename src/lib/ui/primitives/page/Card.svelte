<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, children }: { title?: string; children: Snippet } = $props();
</script>

<section class="rounded-2xl bg-pill p-5 shadow-(--pill-shadow)">
  {#if title}<h2 class="mb-3 font-display text-[16px] font-bold">{title}</h2>{/if}
  {@render children()}
</section>
