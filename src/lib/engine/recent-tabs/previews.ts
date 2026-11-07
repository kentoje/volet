import { browser } from 'wxt/browser';
import { recentTabsEnabled } from './enabled';
import { PreviewStore } from './preview-store';

/** Captures the visible page a moment after a tab comes to the front, and keeps it in a `PreviewStore`. */
export class RecentTabPreviews {
  #store = new PreviewStore();
  #timers = new Map<number, ReturnType<typeof setTimeout>>();
  #lastCapture = 0;
  #capturing = false;

  /** The screenshot of each tab still on the page it was taken of. */
  find(tabs: readonly { id: number; url: string }[]): Promise<Map<number, string>> {
    return this.#store.find(tabs);
  }

  forget(tabId: number): void {
    void this.#store.forget(tabId).catch(() => undefined);
  }

  clear(): void {
    for (const timer of this.#timers.values()) clearTimeout(timer);
    this.#timers.clear();
    void this.#store.clear().catch(() => undefined);
  }

  schedule(tabId: number, windowId: number): void {
    clearTimeout(this.#timers.get(windowId));
    this.#timers.set(windowId, setTimeout(() => {
      this.#timers.delete(windowId);
      void this.#capture(tabId, windowId).catch(() => undefined);
    }, 600));
  }

  async #capture(tabId: number, windowId: number): Promise<void> {
    if (this.#capturing || Date.now() - this.#lastCapture < 600) return;
    this.#capturing = true;
    try {
      // Off (no shortcut, or no site access): take none, and drop the ones kept.
      if (!(await recentTabsEnabled())) {
        await this.#store.clear();
        return;
      }
      const tab = await browser.tabs.get(tabId);
      if (!tab.active || tab.incognito || !tab.url || !/^https?:/.test(tab.url)) return;
      const window = await browser.windows.get(windowId);
      if (!window.focused) return;
      const overlay: unknown = await browser.tabs.sendMessage(tabId, { type: 'recent-tabs:visible' });
      if (typeof overlay !== 'object' || overlay === null || !('visible' in overlay) || overlay.visible !== false) return;
      this.#lastCapture = Date.now();
      const image = await browser.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 25 });
      const current = await browser.tabs.get(tabId);
      if (!current.active || current.url !== tab.url || !(await recentTabsEnabled())) return;
      await this.#store.keep(tabId, tab.url, image);
    } finally { this.#capturing = false; }
  }
}
