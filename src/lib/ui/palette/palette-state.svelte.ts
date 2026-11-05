import type { PaletteClient, PaletteItem } from '@/lib/model/palette';

/** The palette's query, results and selection. Out-of-order search answers are dropped. */
export class PaletteState {
  query = $state('');
  items = $state.raw<PaletteItem[]>([]);
  selected = $state(0);
  hue = $state<number | undefined>();

  #client: PaletteClient;
  #onhue: ((hue: number) => void) | undefined;
  #latest = 0;

  /** `onhue` hears the active Space's hue with each answer, so hosts can tint themselves. */
  constructor(client: PaletteClient, onhue?: (hue: number) => void) {
    this.#client = client;
    this.#onhue = onhue;
  }

  async search(text: string): Promise<void> {
    this.query = text;
    const request = ++this.#latest;
    const results = await this.#client.search(text);
    if (request !== this.#latest) return;
    this.items = results.items;
    this.hue = results.hue;
    this.selected = 0;
    this.#onhue?.(results.hue);
  }

  move(delta: number): void {
    const count = this.items.length;
    if (count) this.selected = (this.selected + delta + count) % count;
  }

  select(index: number): void {
    this.selected = index;
  }

  /** Run the selected (or given) result. Resolves once it has run. */
  async run(index = this.selected): Promise<boolean> {
    const item = this.items[index];
    if (!item) return false;
    await this.#client.run(item);
    return true;
  }
}
