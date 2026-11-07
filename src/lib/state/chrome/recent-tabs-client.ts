import { browser } from 'wxt/browser';
import { isRecentTab, type RecentTabsClient } from '@/lib/model/recent-tabs';
import type { CycleModifier } from '@/lib/model/recent-tab-shortcut';

/**
 * Request recent tabs from the sender's window; Chrome writes stay in the engine. Each answer also carries the window's
 * active Volet's hue (`onhue`), like Search's.
 */
export function chromeRecentTabsClient({ onhue }: { onhue?: (hue: number) => void } = {}): RecentTabsClient {
  return {
    async load() {
      const response: unknown = await browser.runtime.sendMessage({ type: 'recent-tabs:query' });
      if (typeof response !== 'object' || response === null || !('tabs' in response) ||
        !Array.isArray(response.tabs) || !response.tabs.every(isRecentTab)) {
        throw new Error('Recent tabs query failed');
      }
      if ('hue' in response && typeof response.hue === 'number' && Number.isFinite(response.hue)) onhue?.(response.hue);
      return response.tabs;
    },
    async activate(tabId) {
      await runRecentTabAction('recent-tabs:activate', tabId);
    },
    async close(tabId) {
      await runRecentTabAction('recent-tabs:close', tabId);
    },
  };
}

/** Ask the Volet panel of this page's window whether it holds the modifier (it has focus, so this page saw no keys). */
export async function panelHoldsModifier(modifier: CycleModifier): Promise<boolean> {
  const response: unknown = await browser.runtime.sendMessage({ type: 'recent-tabs:panel-holds', modifier });
  return typeof response === 'object' && response !== null && 'holds' in response && response.holds === true;
}

async function runRecentTabAction(type: 'recent-tabs:activate' | 'recent-tabs:close', tabId: number): Promise<void> {
  const response: unknown = await browser.runtime.sendMessage({ type, tabId });
  if (typeof response !== 'object' || response === null || !('ok' in response) || response.ok !== true) {
    throw new Error(`Recent tab action failed: ${type}`);
  }
}
