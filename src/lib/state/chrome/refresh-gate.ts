/**
 * Coordinates reloading state from Chrome with commands in flight:
 * - refreshes never overlap (a request during one triggers one more pass);
 * - while a command runs, refreshes wait, so optimistic updates don't flicker back;
 * - a value loaded before the latest command started is discarded, never applied;
 * - when the last command finishes, one refresh runs.
 */
export class RefreshGate<T> {
  #load: () => Promise<T>;
  #apply: (value: T) => void;
  #inFlight = 0;
  /** Bumped whenever a command starts. */
  #epoch = 0;
  #running: Promise<void> | undefined;
  #pending = false;

  constructor(load: () => Promise<T>, apply: (value: T) => void) {
    this.#load = load;
    this.#apply = apply;
  }

  request(): Promise<void> {
    this.#pending = true;
    if (this.#inFlight > 0) return Promise.resolve();
    this.#running ??= this.#loop().finally(() => (this.#running = undefined));
    return this.#running;
  }

  /**
   * Resolves once the refresh under way (if any) has been applied. Unlike `request`, it asks for
   * no new pass: after a command, `during` has already asked for the one that shows its result.
   */
  settled(): Promise<void> {
    return this.#running ?? Promise.resolve();
  }

  /** Run a command; refreshes are held until it (and any others) finish. */
  async during<R>(work: () => Promise<R>): Promise<R> {
    this.#inFlight++;
    this.#epoch++;
    try {
      return await work();
    } finally {
      this.#inFlight--;
      if (this.#inFlight === 0) void this.request();
    }
  }

  async #loop(): Promise<void> {
    while (this.#pending && this.#inFlight === 0) {
      this.#pending = false;
      const epoch = this.#epoch;
      const value = await this.#load();
      if (epoch !== this.#epoch) {
        // A command started while loading: this value may predate it. Load again.
        this.#pending = true;
        continue;
      }
      this.#apply(value);
    }
  }
}
