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
</script>

{#snippet child({ props }: { props: Record<string, unknown> })}
  {@render trigger(props)}
{/snippet}

{#if group}
  <Tooltip.Trigger tether={group} payload={label} {child} />
{:else}
  <Tooltip.Root>
    <Tooltip.Trigger {child} />
    <TooltipContent>{label}</TooltipContent>
  </Tooltip.Root>
{/if}
