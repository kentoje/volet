<script lang="ts">
  /** How many items the drag carries (two or more). */
  let { count }: { count: number } = $props();

  // dnd-kit marks the row following the pointer with data-dnd-dragging; the copy it leaves in
  // the list doesn't have it, so the stack only shows under the pointer.
  const shown = 'hidden [[data-dnd-dragging]>&]:block';
</script>

<!-- Cards stacked under the dragged row (its parent must be `relative isolate`), and a count. -->
<div class="pointer-events-none absolute inset-0 -z-10 {shown}" aria-hidden="true">
  {#if count > 2}
    <div
      class="absolute inset-0 translate-y-2 scale-x-[0.92] rounded-[10px] bg-(--menu) opacity-60 shadow-(--pill-shadow)"
    ></div>
  {/if}
  <div
    class="absolute inset-0 translate-y-1 scale-x-[0.96] rounded-[10px] bg-(--menu) opacity-85 shadow-(--pill-shadow)"
  ></div>
  <div
    class="absolute inset-0 rounded-[10px] bg-(--menu) shadow-[0_6px_18px_oklch(0.2_0.05_var(--space-hue)/0.22)]"
  ></div>
</div>
<span
  class="pointer-events-none absolute -top-1.5 -right-1.5 h-[18px] min-w-[18px] place-items-center rounded-full bg-ink px-1 text-[11px] font-semibold text-(--menu) tabular-nums hidden [[data-dnd-dragging]>&]:grid"
  aria-hidden="true">{count}</span
>
