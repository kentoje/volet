<script lang="ts">
  import { mergeProps } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import Tooltip from './tooltip/Tooltip.svelte';

  interface Props {
    label: string;
    /** Tooltip, when it should say more than the label. */
    hint?: string;
    onclick: () => void;
    /** Only visible while the parent row is hovered or focused. */
    reveal?: boolean;
    /**
     * Dimmed and inert, but still hoverable and focusable so its tooltip can say why
     * (`aria-disabled` rather than `disabled`, which would also silence the tooltip).
     */
    disabled?: boolean;
    children: Snippet;
  }

  let { label, hint, onclick, reveal = false, disabled = false, children }: Props = $props();
</script>

<Tooltip label={hint ?? label}>
  {#snippet trigger(props)}
    <button
      type="button"
      {...mergeProps(props, {
        class: [
          // Icons don't take the pointer: the button does, so a shared tooltip sees it go button to button.
          'grid size-6 place-items-center rounded-[7px] text-ink-muted transition-opacity duration-100 *:pointer-events-none',
          disabled ? 'cursor-default opacity-40' : 'hover:bg-hover hover:text-ink',
          reveal && 'opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 group-data-hovered/row:opacity-100',
        ],
        'aria-label': label,
        'aria-disabled': disabled || undefined,
        'data-no-drag': '',
        onclick: (event: MouseEvent) => {
          event.stopPropagation();
          if (!disabled) onclick();
        },
      })}
    >
      {@render children()}
    </button>
  {/snippet}
</Tooltip>
