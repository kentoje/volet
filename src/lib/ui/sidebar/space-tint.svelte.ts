import { blendHue, nearestHue } from '@/lib/model/hue';
import type { Space } from '@/lib/model/types';
import type { SpaceSwipe } from './space-swipe.svelte';

const FALLBACK_HUE = 268;

interface TintSource {
  spaces: () => Space[];
  activeIndex: () => number;
  swipe: SpaceSwipe;
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
    const target = this.#source.spaces()[this.#source.activeIndex()]?.hue ?? FALLBACK_HUE;
    const hue = this.#previous === undefined ? target : nearestHue(this.#previous, target);
    this.#previous = hue; // memory, not state: only used to unwrap the next value
    return hue;
  });

  hue = $derived.by(() => {
    const { swipe, spaces, activeIndex } = this.#source;
    if (!swipe.dragging) return this.#base;
    const neighbor = spaces()[activeIndex() + Math.sign(swipe.progress)];
    return neighbor ? blendHue(this.#base, neighbor.hue, Math.abs(swipe.progress)) : this.#base;
  });
}
