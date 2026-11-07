import { browser, type Browser } from 'wxt/browser';
import { recentTabOffset, type RecentTabCommand } from '@/lib/model/recent-tab-shortcut';
import type { Engine } from '../engine';
import { recentTabsEnabled } from './enabled';
import { loadRecentTabs } from './history';

/** Native commands supply every cycle step; the preloaded page listener supplies release. */
export async function cycleRecentTabs(engine: Engine, tab: Browser.tabs.Tab | undefined, command: RecentTabCommand): Promise<void> {
  if (tab?.id === undefined) return;
  if (!(await recentTabsEnabled())) {
    await browser.runtime.openOptionsPage();
    return;
  }
  const commands = await browser.commands.getAll();
  const shortcut = commands.find((candidate) => candidate.name === command)?.shortcut;
  if (!shortcut) return;
  try {
    await browser.tabs.sendMessage(tab.id, { type: 'recent-tabs:step', shortcut, offset: recentTabOffset(command) });
  } catch {
    // Chrome pages and the Web Store cannot host an overlay: either direction starts with the previous tab.
    const target = await engine.enqueue(async () => (await loadRecentTabs(tab.windowId))[1]);
    if (target) await engine.run({ type: 'activateTab', tabId: target.id });
  }
}
