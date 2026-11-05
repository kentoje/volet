<script lang="ts">
  import type { Space } from '@/lib/model/types';
  import DropHint from '../primitives/DropHint.svelte';
  import PinnedTree from './PinnedTree.svelte';

  let { space }: { space: Space } = $props();
</script>

{#if space.pinned.length}
  <PinnedTree nodes={space.pinned} />
{:else}
  <DropHint>Drag tabs here to pin them to {space.name}.</DropHint>
{/if}
