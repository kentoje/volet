<script lang="ts">
  import type { PaletteClient } from '@/lib/model/palette';
  import PaletteView from '../primitives/palette/PaletteView.svelte';
  import { PaletteState } from './palette-state.svelte';

  interface Props {
    client: PaletteClient;
    onclose: () => void;
    /** Reports the active Space's hue, so the host can tint itself. */
    onhue?: (hue: number) => void;
  }

  let { client, onclose, onhue }: Props = $props();

  // The client and callback are fixed for the palette's lifetime.
  // svelte-ignore state_referenced_locally
  const palette = new PaletteState(client, (hue) => onhue?.(hue));
  void palette.search('');

  async function pick(index: number) {
    if (await palette.run(index)) onclose();
  }
</script>

<PaletteView
  query={palette.query}
  items={palette.items}
  selected={palette.selected}
  oninput={(text) => void palette.search(text)}
  onmove={(delta) => palette.move(delta)}
  onpick={(index) => void pick(index)}
  onhover={(index) => palette.select(index)}
  {onclose}
/>
