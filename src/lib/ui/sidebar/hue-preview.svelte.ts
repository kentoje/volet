import { createContext } from 'svelte';
import type { Space, SpaceId } from '@/lib/model/types';

/**
 * A Space's color while it's being picked (the Space menu's hue slider): the panel's tint and the
 * Space's shutter follow it right away, and it's saved once, when the slider settles. Sending a
 * command per move would write storage and recolor the tab group each time.
 */
export class HuePreview {
  #current = $state<{ spaceId: SpaceId; hue: number }>();

  /** Whether a color is being picked: the tint then follows it directly, without its glide. */
  get active(): boolean {
    return this.#current !== undefined;
  }

  show(spaceId: SpaceId, hue: number): void {
    this.#current = { spaceId, hue };
  }

  end(): void {
    this.#current = undefined;
  }

  /** The color to show for `space`: the one being picked for it, else its own. */
  hueOf(space: Space): number {
    return this.#current?.spaceId === space.id ? this.#current.hue : space.hue;
  }
}

export const [getHuePreview, setHuePreview] = createContext<HuePreview>();
