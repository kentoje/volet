<script lang="ts">
  import { onDestroy } from 'svelte';
  import { hueGradient } from '@/lib/model/hue';

  interface Props {
    label: string;
    value: number;
    /** Each move, to show the hue right away. */
    oninput: (hue: number) => void;
    /** Once the hue settles, to save it: let go of, a moment after the last key press, or left. */
    oncommit: (hue: number) => void;
  }

  let { label, value, oninput, oncommit }: Props = $props();

  /** How long after a key press the hue counts as settled, so a held arrow key saves once. */
  const SETTLE_MS = 300;

  const track = hueGradient();
  /** The hue shown but not saved yet. */
  let pending: number | undefined;
  let byKey = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function input(event: Event & { currentTarget: HTMLInputElement }) {
    pending = Number(event.currentTarget.value);
    oninput(pending);
  }

  function change() {
    clearTimeout(timer);
    if (byKey) timer = setTimeout(commit, SETTLE_MS);
    else commit();
  }

  /** Save the pending hue now. Also when leaving the slider, so it never lands after a swatch picked next. */
  function commit() {
    clearTimeout(timer);
    if (pending === undefined) return;
    const hue = pending;
    pending = undefined;
    oncommit(hue);
  }

  // The menu closing (Escape, a click away) still saves where the slider was left.
  onDestroy(commit);
</script>

<!-- Bits UI moves arrow-key focus between the elements carrying its item attribute: with it, ArrowDown
     from the swatches reaches the slider and ArrowUp leaves it, while Left and Right stay the slider's. -->
<input
  type="range"
  min="0"
  max="359"
  step="1"
  {value}
  aria-label={label}
  aria-valuetext="Hue {value}"
  data-context-menu-item=""
  data-dropdown-menu-item=""
  class="block h-2.5 w-full cursor-default appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-(--thumb) [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_var(--dot-ring),0_1px_3px_oklch(0_0_0/0.3)] focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_2px_var(--dot-ring),0_0_0_4px_var(--focus)]"
  style:background={track}
  style:--thumb="oklch(var(--dot-l) var(--dot-c) {value})"
  oninput={input}
  onchange={change}
  onkeydown={() => (byKey = true)}
  onpointerdown={() => (byKey = false)}
  onblur={commit}
/>
