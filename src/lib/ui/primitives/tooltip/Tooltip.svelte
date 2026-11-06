<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { getTooltipGroup, inTooltipGroup } from './context';
  import TooltipContent from './TooltipContent.svelte';

  interface Props {
    label: string;
    /** Renders the trigger element; spread the props onto it. */
    trigger: Snippet<[Record<string, unknown>]>;
  }

  let { label, trigger }: Props = $props();

  /** Inside a `TooltipGroup`, the group's one tooltip shows this label. */
  const group = inTooltipGroup() ? getTooltipGroup() : undefined;
  /** The tooltip mounts the first time it shows, then stays (it fades out). */
  let used = $state(false);
</script>

{#snippet child({ props }: { props: Record<string, unknown> })}
  {@render trigger(props)}
{/snippet}

{#if group}
  <Tooltip.Trigger tether={group} payload={label} {child} />
{:else}
  <Tooltip.Root onOpenChange={(open) => (used ||= open)}>
    <Tooltip.Trigger {child} />
    {#if used}
      <TooltipContent>{label}</TooltipContent>
    {/if}
  </Tooltip.Root>
{/if}
