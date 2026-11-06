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
  /** The tooltip mounts the first time it shows, then stays (it fades out): every row has a group. */
  let used = $state(false);
</script>

{@render grouped()}
<Tooltip.Root {tether} onOpenChange={(open) => (used ||= open)}>
  {#snippet children({ payload })}
    {#if used}
      <TooltipContent glide>{payload}</TooltipContent>
    {/if}
  {/snippet}
</Tooltip.Root>
