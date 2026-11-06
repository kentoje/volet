/** Chrome refuses tab edits while the user drags a tab in the strip; those calls are retried. */
const RETRYABLE = /dragging|cannot be edited right now|user may be/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** What went wrong, as text (Chrome rejects with errors, or with plain `{ message }` objects). */
export function errorMessage(error: unknown): string {
  return String((error as { message?: unknown } | null | undefined)?.message ?? error);
}

/** Call a Chrome tab API, retrying with backoff while the tab strip is locked by a drag. */
export async function retry<T>(call: () => Promise<T>, attempts = 12): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      if (attempt >= attempts || !RETRYABLE.test(errorMessage(error))) throw error;
      await sleep(Math.min(100 + attempt * 100, 1000));
    }
  }
}

/** Runs tasks strictly one after another, so no two writes to Chrome ever interleave. */
export class SerialQueue {
  #tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.#tail.then(task);
    this.#tail = result.catch(() => undefined);
    return result;
  }
}
