<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    onclick: () => void;
    /** Only visible while the parent row is hovered or focused. */
    reveal?: boolean;
    /** Opaque background, for buttons drawn over a favicon. */
    solid?: boolean;
    children: Snippet;
  }

  let { label, onclick, reveal = false, solid = false, children }: Props = $props();
</script>

<button
  type="button"
  class={[
    'grid size-6 place-items-center rounded-[7px] text-ink-muted transition-opacity duration-100 hover:bg-hover hover:text-ink',
    solid && 'bg-pill text-ink shadow-(--pill-shadow)',
    reveal && 'opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100',
  ]}
  aria-label={label}
  title={label}
  data-no-drag
  onclick={(event) => {
    event.stopPropagation();
    onclick();
  }}
>
  {@render children()}
</button>
