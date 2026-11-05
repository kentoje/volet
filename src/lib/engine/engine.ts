import { browser } from 'wxt/browser';
import { execute } from './commands';
import { activeSpaceOf, loadContext, spaceOfTab } from './context';
import type { Command } from './protocol';
import { reconcile } from './reconcile';
import { SerialQueue } from './retry';
import { rememberActive, stampActivity } from './session';

/**
 * The only writer to Chrome. Commands from the UI and the engine's own upkeep
 * run through one serial queue, so they never race each other.
 */
export class Engine {
  #queue = new SerialQueue();
  #reconcileTimers = new Map<number, ReturnType<typeof setTimeout>>();

  run(command: Command): Promise<unknown> {
    return this.#queue.run(() => execute(command));
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return this.#queue.run(task);
  }

  reconcile(windowId: number, options?: { recover?: boolean }): Promise<void> {
    return this.enqueue(() => reconcile(windowId, options));
  }

  /** Coalesce bursts of Chrome events into one reconcile per window. */
  scheduleReconcile(windowId: number | undefined, delay = 60): void {
    if (windowId === undefined || windowId < 0) return;
    clearTimeout(this.#reconcileTimers.get(windowId));
    this.#reconcileTimers.set(
      windowId,
      setTimeout(() => {
        this.#reconcileTimers.delete(windowId);
        this.reconcile(windowId).catch((error) => console.warn('reconcile failed', error));
      }, delay),
    );
  }

  async reconcileAll(options: { recover?: boolean } = {}): Promise<void> {
    for (const window of await browser.windows.getAll({ windowTypes: ['normal'] })) {
      if (window.id !== undefined) await this.reconcile(window.id, options);
    }
  }

  /** Track the tab last used in each Space; follow the tab into its Space if it lives elsewhere. */
  onActivated(tabId: number, windowId: number): Promise<void> {
    return this.enqueue(async () => {
      await stampActivity([tabId]);
      const ctx = await loadContext(windowId);
      const tab = ctx.tabs.find((t) => t.id === tabId);
      const spaceId = tab ? spaceOfTab(ctx, tab) : undefined;
      if (!spaceId) return;
      await rememberActive(windowId, spaceId, tabId);
      if (spaceId !== activeSpaceOf(ctx)) this.scheduleReconcile(windowId, 0);
    });
  }
}
