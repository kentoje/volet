<script lang="ts">
  import { mergeProps } from 'bits-ui';
  import Tooltip from './tooltip/Tooltip.svelte';

  interface Action {
    label: string;
    /** Longer description, shown as a tooltip. */
    description: string;
    onclick: () => void;
  }

  /** `action` shows as a small button after the line, like Arc's "Clear". */
  let { action }: { action?: Action } = $props();
</script>

<!-- No top margin: the list above ends with its own drop strip, the same height. -->
<div class="mb-2 flex h-5 items-center gap-2 px-2.5">
  <span class="h-px flex-1 bg-rule"></span>
  {#if action}
    <Tooltip label={action.description}>
      {#snippet trigger(props)}
        <button
          type="button"
          {...mergeProps(props, {
            class:
              '-mr-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-ink-muted hover:bg-hover hover:text-ink data-hovered:bg-hover',
            onclick: action.onclick,
          })}
        >
          {action.label}
        </button>
      {/snippet}
    </Tooltip>
  {/if}
</div>
