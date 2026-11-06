<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte';
  import type { MountQueue } from './mount-queue';

  interface Props {
    /** Paces the mounting; without one, the content mounts at once. */
    queue?: MountQueue;
    /** Height kept for the content while it waits, so nothing around it moves. */
    height: number;
    children: Snippet;
  }

  let { queue, height, children }: Props = $props();

  // Asked once, when the row is created: a row already shown never goes back to waiting.
  // svelte-ignore state_referenced_locally
  let ready = $state(!queue || queue.take());
  // svelte-ignore state_referenced_locally
  if (!ready && queue) onDestroy(queue.wait(() => (ready = true)));
</script>

{#if ready}
  {@render children()}
{:else}
  <div style:height="{height}px" aria-hidden="true"></div>
{/if}
