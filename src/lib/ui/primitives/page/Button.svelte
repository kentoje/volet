<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    onclick: () => void;
    /** The page's main action. */
    primary?: boolean;
    disabled?: boolean;
    children: Snippet;
  }

  let { onclick, primary = false, disabled = false, children }: Props = $props();
</script>

<button
  type="button"
  class={[
    'h-9 rounded-lg px-4 text-[13px] font-medium transition-colors disabled:opacity-40',
    primary ? 'bg-(--focus) text-white hover:brightness-110' : 'bg-hover hover:bg-rule',
  ]}
  {disabled}
  {onclick}
>
  {@render children()}
</button>
