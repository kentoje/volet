<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { setTooltipGroup } from './context';
  import TooltipContent from './TooltipContent.svelte';

  /**
   * The tooltips inside share one tooltip: it fades in on the first, glides from one trigger
   * to the next (only one is ever shown), and fades out when the pointer leaves them all.
   */
  let { children: grouped }: { children: Snippet } = $props();

  const tether = setTooltipGroup(Tooltip.createTether<string>());
</script>

{@render grouped()}
<Tooltip.Root {tether}>
  {#snippet children({ payload })}
    <TooltipContent glide>{payload}</TooltipContent>
  {/snippet}
</Tooltip.Root>
