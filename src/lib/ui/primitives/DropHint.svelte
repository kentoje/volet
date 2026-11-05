<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<!-- Placeholder for an empty list that accepts drops. -->
<p class="mx-1 rounded-[10px] border border-dashed border-rule px-3 py-3 text-[12px] text-ink-muted">
  {@render children()}
</p>
