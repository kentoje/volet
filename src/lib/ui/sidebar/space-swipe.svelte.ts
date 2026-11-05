/** Share of the panel width a swipe must travel to switch Space mid-gesture. */
const COMMIT_RATIO = 0.28;
/** Share of the width that still switches when the fingers lift early. */
const RELEASE_RATIO = 0.14;
/** A gesture ends after this long without wheel events (this also swallows momentum). */
const GESTURE_END_MS = 130;
/** Resistance when swiping past the first or last Space. */
const EDGE_RESISTANCE = 0.2;

type Direction = -1 | 1;

interface SwipeOptions {
  canGo: (direction: Direction) => boolean;
  onCommit: (direction: Direction) => void;
}

/**
 * Turns horizontal trackpad scrolling into a one-Space-per-swipe pager.
 * `offset` is how far the content is dragged, in px (negative = toward the next Space).
 */
export class SpaceSwipe {
  offset = $state(0);
  dragging = $state(false);
  width = $state(1);

  #options: SwipeOptions;
  #endTimer: ReturnType<typeof setTimeout> | undefined;
  /** Set once a gesture has switched Space, until the fingers (and momentum) stop. */
  #spent = false;

  constructor(options: SwipeOptions) {
    this.#options = options;
  }

  /** Progress toward the neighboring Space, from -1 (previous) to 1 (next). */
  get progress(): number {
    return -this.offset / this.width;
  }

  /** Attachment: listens non-passively so the swipe can't scroll or navigate the page. */
  attach = (node: HTMLElement) => {
    node.addEventListener('wheel', this.#onWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', this.#onWheel);
      clearTimeout(this.#endTimer);
    };
  };

  #onWheel = (event: WheelEvent) => {
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (!horizontal && !this.dragging && !this.#spent) return;
    event.preventDefault();

    clearTimeout(this.#endTimer);
    this.#endTimer = setTimeout(this.#end, GESTURE_END_MS);
    if (this.#spent) return;

    const step = -event.deltaX;
    const direction: Direction = this.offset + step > 0 ? -1 : 1;
    const allowed = this.#options.canGo(direction);
    this.dragging = true;
    const next = this.offset + (allowed ? step : step * EDGE_RESISTANCE);
    this.offset = Math.max(-this.width, Math.min(this.width, next));

    if (allowed && Math.abs(this.offset) >= this.width * COMMIT_RATIO) {
      this.#spent = true;
      this.#commit(direction);
    }
  };

  #end = () => {
    if (!this.#spent && this.dragging) {
      const direction: Direction = this.offset > 0 ? -1 : 1;
      const far = Math.abs(this.offset) >= this.width * RELEASE_RATIO;
      if (far && this.#options.canGo(direction)) this.#commit(direction);
    }
    this.offset = 0;
    this.dragging = false;
    this.#spent = false;
  };

  #commit(direction: Direction) {
    // Stop following the fingers first, so the CSS transitions animate from here.
    this.dragging = false;
    this.offset = 0;
    this.#options.onCommit(direction);
  }
}
