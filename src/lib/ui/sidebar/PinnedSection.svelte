<script lang="ts">
  import type { Space } from '@/lib/model/types';
  import DropHint from '../primitives/DropHint.svelte';
  import PinnedList from './PinnedList.svelte';

  let { space }: { space: Space } = $props();
</script>

<!--
  The strip below the last pin (above the divider) drops at the end, even after an open folder.
  Empty, the hint is the drop target: the same space is a margin, so the list lights up just the hint.
-->
<PinnedList parentId={space.id} nodes={space.pinned} class={space.pinned.length ? 'pb-2' : 'mb-2'}>
  {#snippet empty()}
    <DropHint>Drag tabs here to pin them to {space.name}.</DropHint>
  {/snippet}
</PinnedList>
