<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { TOOLTIP_PLACEMENT } from './menu/placement';
  import { OVERLAY_ROOT } from './overlay';

  interface Props {
    label: string;
    /**
     * The described element. It receives the tooltip's trigger props to spread on itself
     * (handlers, aria-describedby), so the real button is the trigger: no extra wrapper or tab stop.
     */
    trigger: Snippet<[Record<string, unknown>]>;
  }

  let { label, trigger }: Props = $props();
</script>

<!-- Needs a Tooltip.Provider above it (the sidebar has one). -->
<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      {@render trigger(props)}
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Portal to={OVERLAY_ROOT}>
    <Tooltip.Content class="tooltip-surface" {...TOOLTIP_PLACEMENT}>{label}</Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>
