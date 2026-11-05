<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { TOOLTIP_PLACEMENT } from '../menu/placement';
  import { OVERLAY_ROOT } from '../overlay';

  interface Props {
    /** Glide from one trigger to the next instead of jumping (a shared tooltip). */
    glide?: boolean;
    children: Snippet;
  }

  let { glide = false, children }: Props = $props();

  /** Bits UI places a new tooltip within a frame or two; this leaves a safe margin. */
  const PLACED_MS = 80;

  /** Start gliding once the tooltip has been placed, so it never glides in from where it is parked. */
  const glideOncePlaced: Attachment<HTMLElement> = (node) => {
    const timer = setTimeout(() => (node.dataset.glide = ''), PLACED_MS);
    return () => clearTimeout(timer);
  };
</script>

<!-- Fades in and out (.tooltip-surface); the wrapper is what Bits UI moves into place. -->
<Tooltip.Portal to={OVERLAY_ROOT}>
  <Tooltip.Content class="tooltip-surface" {...TOOLTIP_PLACEMENT}>
    {#snippet child({ wrapperProps, props })}
      <div {...wrapperProps} {@attach glide && glideOncePlaced}>
        <div {...props}>{@render children()}</div>
      </div>
    {/snippet}
  </Tooltip.Content>
</Tooltip.Portal>
