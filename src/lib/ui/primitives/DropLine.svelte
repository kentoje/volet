<script lang="ts">
  interface Props {
    /** Which edge of the row (or tile) it marks. */
    side: 'before' | 'after';
    /** `y` for rows (a horizontal line in the gap above or below), `x` for tiles. */
    axis?: 'x' | 'y';
    /** Rows indent with their depth, and so does the line. */
    depth?: number;
  }

  let { side, axis = 'y', depth = 0 }: Props = $props();
</script>

<!-- Where a dragged row will land. Sits in the gap next to its row (or tile), which must be positioned. -->
<span
  aria-hidden="true"
  data-drop-line={side}
  class={[
    'pointer-events-none absolute z-10 rounded-full bg-(--focus)',
    axis === 'y'
      ? ['right-1.5 left-[calc(6px+var(--depth)*16px)] h-0.5', side === 'before' ? '-top-0.5' : '-bottom-0.5']
      : ['inset-y-1 w-0.5', side === 'before' ? '-left-1' : '-right-1'],
  ]}
  style:--depth={depth}
></span>
