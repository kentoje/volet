import { blendHue, nearestHue } from '@/lib/model/hue';
import type { Space } from '@/lib/model/types';
import type { SpaceSwipe } from './space-swipe.svelte';

const FALLBACK_HUE = 268;

interface TintSource {
  spaces: () => Space[];
  activeIndex: () => number;
  swipe: SpaceSwipe;
  /** The color shown for a Space (the one being picked for it, see HuePreview). */
  hueOf: (space: Space) => number;
}

/** The panel's tint: the active Space's hue, blended toward the neighbor while swiping. */
export class SpaceTint {
  #source: TintSource;
  #previous: number | undefined;

  constructor(source: TintSource) {
    this.#source = source;
  }

  /**
   * The active Space's hue, kept "unwrapped" (e.g. 400 instead of 40) relative to the
   * previous one, so the CSS transition always takes the short way around the wheel.
   */
  #base = $derived.by(() => {
    const { spaces, activeIndex, hueOf } = this.#source;
    const active = spaces()[activeIndex()];
    const target = active ? hueOf(active) : FALLBACK_HUE;
    const hue = this.#previous === undefined ? target : nearestHue(this.#previous, target);
    this.#previous = hue; // memory, not state: only used to unwrap the next value
    return hue;
  });

  hue = $derived.by(() => {
    const { swipe, spaces, activeIndex, hueOf } = this.#source;
    if (!swipe.dragging) return this.#base;
    const neighbor = spaces()[activeIndex() + Math.sign(swipe.progress)];
    return neighbor ? blendHue(this.#base, hueOf(neighbor), Math.abs(swipe.progress)) : this.#base;
  });
}
