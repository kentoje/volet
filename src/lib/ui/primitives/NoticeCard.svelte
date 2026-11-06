<script lang="ts">
  import { X } from '@lucide/svelte';
  import IconButton from './IconButton.svelte';

  interface Props {
    title: string;
    text: string;
    /** The card's one action, as a button label. */
    action: string;
    onaction: () => void;
    ondismiss: () => void;
  }

  let { title, text, action, onaction, ondismiss }: Props = $props();
</script>

<!-- A small card above the switcher, for a one-time suggestion. -->
<aside class="relative mx-2.5 mb-1.5 flex-none rounded-xl bg-tile px-3 py-2.5 text-[13px]" aria-label={title}>
  <p class="pr-7 font-semibold">{title}</p>
  <p class="mt-0.5 pr-7 leading-snug text-ink-muted">{text}</p>
  <button
    type="button"
    class="mt-2 h-7 rounded-lg bg-pill px-2.5 font-medium shadow-(--pill-shadow) hover:brightness-105"
    onclick={onaction}
  >
    {action}
  </button>
  <div class="absolute top-2 right-2">
    <IconButton label="Dismiss" onclick={ondismiss}>
      <X size={14} strokeWidth={2} />
    </IconButton>
  </div>
</aside>
