<script lang="ts">
  import type { PaletteClient } from '@/lib/model/palette';
  import PaletteBox from '../../palette/PaletteBox.svelte';
  import type { PanelPaletteState } from './panel-palette-state.svelte';

  let { client, state: palette }: { client: PaletteClient; state: PanelPaletteState } = $props();

  // Requests from the worker (the shortcut pressed on a page that can't show the palette).
  // svelte-ignore state_referenced_locally
  client.onOpenRequest?.(() => palette.show());

  /** ⌘K / Ctrl+K anywhere in the panel, or "/" when not typing. */
  function onkeydown(event: KeyboardEvent) {
    const typing = event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable]');
    const modK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (modK || (event.key === '/' && !typing)) {
      event.preventDefault();
      palette.show();
    }
  }
</script>

<svelte:window {onkeydown} />

{#if palette.open}
  <div class="absolute inset-0 z-40 flex flex-col p-2.5" role="dialog" aria-modal="true" aria-label="Search">
    <div
      class="absolute inset-0 bg-[oklch(0.2_0.03_var(--space-hue)/0.25)]"
      aria-hidden="true"
      onclick={() => palette.hide()}
    ></div>
    <div class="menu-surface relative overflow-hidden p-0">
      <PaletteBox {client} onclose={() => palette.hide()} />
    </div>
  </div>
{/if}
