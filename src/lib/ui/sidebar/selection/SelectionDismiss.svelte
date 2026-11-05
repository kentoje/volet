<script lang="ts">
  import { getSelection } from './selection.svelte';

  const selection = getSelection();

  /**
   * A pointer down that keeps the selection: on a selected row, with a modifier (selecting
   * more), or in a menu or dialog (acting on it). Anything else is a click outside.
   */
  const keeps = (event: PointerEvent) =>
    event.shiftKey || event.metaKey || event.ctrlKey || within(event, '[data-selected], [data-overlay-root]');

  const within = (event: Event, selector: string) =>
    event.target instanceof Element && event.target.closest(selector) !== null;
</script>

<!-- Clears the selection on a click outside it (in the page too: the panel loses focus), or on
     Escape, unless something else handled it first (Bits UI closing a menu or dialog). -->
<svelte:window
  onpointerdowncapture={(event) => keeps(event) || selection.clear()}
  onblur={() => selection.clear()}
  onkeydown={(event) => event.key === 'Escape' && !event.defaultPrevented && selection.clear()}
/>
