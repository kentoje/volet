/**
 * Spreads the mounting of many rows over frames, so a big change (a folder opening on a hundred
 * pins) never freezes the panel: up to `perFrame` rows mount at once, the rest wait their turn, in
 * the order they asked, on the next frames. Small changes stay within the budget and mount at once.
 * The first render (before the first frame) has no limit, so the panel opens as fast as before.
 */
export class MountQueue {
  readonly perFrame: number;
  #used = 0;
  #waiting: (() => void)[] = [];
  #frame: number | undefined;
  #warm = false;

  constructor(perFrame = 16) {
    this.perFrame = perFrame;
    requestAnimationFrame(() => (this.#warm = true));
  }

  /** Whether a row may mount right now (it then counts against this frame's budget). */
  take(): boolean {
    if (!this.#warm) return true;
    if (this.#waiting.length > 0 || this.#used >= this.perFrame) return false;
    this.#used++;
    this.#schedule();
    return true;
  }

  /** Call `ready` when the row's turn comes. Returns a function that gives up the turn. */
  wait(ready: () => void): () => void {
    this.#waiting.push(ready);
    this.#schedule();
    return () => {
      const index = this.#waiting.indexOf(ready);
      if (index >= 0) this.#waiting.splice(index, 1);
    };
  }

  #schedule(): void {
    this.#frame ??= requestAnimationFrame(() => {
      this.#frame = undefined;
      this.#used = 0;
      for (const ready of this.#waiting.splice(0, this.perFrame)) {
        this.#used++;
        ready();
      }
      if (this.#used > 0) this.#schedule(); // reset the budget next frame (and serve who's left)
    });
  }
}
