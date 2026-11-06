<script lang="ts">
  /** How many items the drag carries. */
  let { count }: { count: number } = $props();

  // The cards behind form as the carried rows arrive (see group-motion.ts).
  // (Class names are written out in full so Tailwind finds them.)
  const behind = 'animate-[drag-stack-in_120ms_ease-out_130ms_both] motion-reduce:animate-none';
</script>

<!--
  The card of a dragged row, with more stacked behind it when it carries several, and a count.
  Its parent must be positioned and `isolate`: the cards sit behind its content.
-->
<div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
  {#if count > 2}
    <div
      class="absolute inset-0 translate-y-2 scale-x-[0.92] rounded-[10px] bg-(--menu) opacity-60 shadow-(--pill-shadow) {behind}"
    ></div>
  {/if}
  {#if count > 1}
    <div
      class="absolute inset-0 translate-y-1 scale-x-[0.96] rounded-[10px] bg-(--menu) opacity-85 shadow-(--pill-shadow) {behind}"
    ></div>
  {/if}
  <div
    class="absolute inset-0 rounded-[10px] bg-(--menu) shadow-[0_6px_18px_oklch(0.2_0.05_var(--space-hue)/0.22)]"
  ></div>
</div>
{#if count > 1}
  <span
    class="pointer-events-none absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ink px-1 text-[11px] font-semibold text-(--menu) tabular-nums {behind}"
    aria-hidden="true">{count}</span
  >
{/if}
