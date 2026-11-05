import type { PaletteItem, PaletteResults } from '@/lib/engine/palette/types';

export type { PaletteItem, PaletteResults };

/** What the palette UI needs: search, run a result, and hear when it should open. */
export interface PaletteClient {
  search(text: string): Promise<PaletteResults>;
  run(item: PaletteItem): Promise<void>;
  /** Calls `open` when something asks for the palette (e.g. the shortcut, on a page that can't host it). */
  onOpenRequest?(open: () => void): void;
}
