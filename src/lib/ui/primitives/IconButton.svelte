<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    /** Tooltip, when it should say more than the label. */
    hint?: string;
    onclick: () => void;
    /** Only visible while the parent row is hovered or focused. */
    reveal?: boolean;
    children: Snippet;
  }

  let { label, hint, onclick, reveal = false, children }: Props = $props();
</script>

<button
  type="button"
  class={[
    'grid size-6 place-items-center rounded-[7px] text-ink-muted transition-opacity duration-100 hover:bg-hover hover:text-ink',
    reveal && 'opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100',
  ]}
  aria-label={label}
  title={hint ?? label}
  data-no-drag
  onclick={(event) => {
    event.stopPropagation();
    onclick();
  }}
>
  {@render children()}
</button>
