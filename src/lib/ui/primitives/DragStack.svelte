<script lang="ts">
  /** How many items the drag carries (two or more). */
  let { count }: { count: number } = $props();

  // dnd-kit marks the row following the pointer with data-dnd-dragging (and data-dnd-dropping as
  // it lands); the copy it leaves in the list has neither, so the stack only shows under the
  // pointer. The cards behind form as the carried rows arrive, and leave at the drop as those
  // rows fly out of them (see group-motion.ts); the row's own card stays until it has landed.
  // (Class names are written out in full so Tailwind finds them.)
  const stack = 'hidden [[data-dnd-dragging]>&]:block';
  const behind =
    'animate-[drag-stack-in_120ms_ease-out_130ms_both] motion-reduce:animate-none [[data-dnd-dropping]>*>&]:hidden';
  const badge =
    'hidden [[data-dnd-dragging]:not([data-dnd-dropping])>&]:grid animate-[drag-stack-in_120ms_ease-out_130ms_both] motion-reduce:animate-none';
</script>

<!-- Cards stacked under the dragged row (its parent must be `relative isolate`), and a count. -->
<div class="pointer-events-none absolute inset-0 -z-10 {stack}" aria-hidden="true">
  {#if count > 2}
    <div
      class="absolute inset-0 translate-y-2 scale-x-[0.92] rounded-[10px] bg-(--menu) opacity-60 shadow-(--pill-shadow) {behind}"
    ></div>
  {/if}
  <div
    class="absolute inset-0 translate-y-1 scale-x-[0.96] rounded-[10px] bg-(--menu) opacity-85 shadow-(--pill-shadow) {behind}"
  ></div>
  <!-- The dragged row's own card shows at once; the cards behind it form as the rows arrive. -->
  <div
    class="absolute inset-0 rounded-[10px] bg-(--menu) shadow-[0_6px_18px_oklch(0.2_0.05_var(--space-hue)/0.22)]"
  ></div>
</div>
<span
  class="pointer-events-none absolute -top-1.5 -right-1.5 h-[18px] min-w-[18px] place-items-center rounded-full bg-ink px-1 text-[11px] font-semibold text-(--menu) tabular-nums {badge}"
  aria-hidden="true">{count}</span
>
