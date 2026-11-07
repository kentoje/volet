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
  const offset = recentTabOffset(command);
  const commands = await browser.commands.getAll();
  const shortcut = commands.find((candidate) => candidate.name === command)?.shortcut;
  if (!shortcut) return;
  try {
    await browser.tabs.sendMessage(tab.id, { type: 'recent-tabs:step', shortcut, offset });
  } catch {
    // Chrome pages and the Web Store cannot host an overlay: switch where a quick tap would, the last used tab when
    // cycling, the oldest in reverse (wrapping around from the current tab).
    const target = await engine.enqueue(async () => {
      const tabs = await loadRecentTabs(tab.windowId);
      return tabs.length > 1 ? tabs.at(offset) : undefined;
    });
    if (target) await engine.run({ type: 'activateTab', tabId: target.id });
  }
}
