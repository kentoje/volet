<script lang="ts">
  import type { Space } from '@/lib/model/types';
  import DropHint from '../primitives/DropHint.svelte';
  import PinnedList from './PinnedList.svelte';

  let { space }: { space: Space } = $props();
</script>

<PinnedList parentId={space.id} nodes={space.pinned}>
  {#snippet empty()}
    <DropHint>Drag tabs here to pin them to {space.name}.</DropHint>
  {/snippet}
</PinnedList>
