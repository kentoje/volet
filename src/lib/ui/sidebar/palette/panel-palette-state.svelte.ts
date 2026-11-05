import { createContext } from 'svelte';

/** Whether the palette is showing inside the side panel. */
export class PanelPaletteState {
  open = $state(false);

  show(): void {
    this.open = true;
  }

  hide(): void {
    this.open = false;
  }
}

export const [getPanelPalette, setPanelPalette] = createContext<PanelPaletteState | undefined>();
