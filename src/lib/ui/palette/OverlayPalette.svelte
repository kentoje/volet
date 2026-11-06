<script lang="ts">
  import type { PaletteClient } from '@/lib/model/palette';
  import { colorScheme } from '../primitives/color-scheme';
  import PaletteBox from './PaletteBox.svelte';

  let { client, onclose }: { client: PaletteClient; onclose: () => void } = $props();

  let hue = $state(268);
</script>

<!-- The palette over a web page: a dimmed backdrop and a centered box tinted like the sidebar. -->
<div class="palette-root" data-scheme={colorScheme()} style:--space-hue={hue}>
  <div class="palette-backdrop" aria-hidden="true" onclick={onclose}></div>
  <div class="palette-box" role="dialog" aria-modal="true" aria-label="Search">
    <PaletteBox {client} {onclose} onhue={(next) => (hue = next)} />
  </div>
</div>
