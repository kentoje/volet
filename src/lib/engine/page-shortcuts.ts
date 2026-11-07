import { browser, type Browser } from 'wxt/browser';
import { isPageShortcut, matchesPageShortcut, PAGE_SHORTCUT_ORIGINS } from '../model/page-shortcut';
import { execute } from './commands';
import type { Engine } from './engine';
import { pinShortcutItem } from './storage';

const SCRIPT_ID = 'volet-page-shortcuts';
const SCRIPT_FILE = '/page-shortcuts.js';

/** Keep the optional page shortcut installed across navigations, browser restarts and permission changes. */
export function listenForPageShortcuts(engine: Engine): void {
  const refresh = () => {
    void engine.enqueue(syncPageShortcuts).catch((error) => console.warn('Page shortcut registration failed', error));
  };
  pinShortcutItem.watch(refresh);
  browser.permissions.onAdded.addListener(refresh);
  browser.permissions.onRemoved.addListener(refresh);
  refresh();
}

async function syncPageShortcuts(): Promise<void> {
  const enabled = isPageShortcut(await pinShortcutItem.getValue()) &&
    await browser.permissions.contains({ origins: PAGE_SHORTCUT_ORIGINS });
  const registered = (await browser.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] })).length > 0;
  if (!enabled) {
    if (registered) await browser.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
    return;
  }
  if (!registered) {
    await browser.scripting.registerContentScripts([{
      id: SCRIPT_ID, js: [SCRIPT_FILE], matches: PAGE_SHORTCUT_ORIGINS,
      allFrames: true, runAt: 'document_start', persistAcrossSessions: true,
    }]);
  }
  // Also support pages that were already open before the shortcut was enabled.
  const tabs = await browser.tabs.query({ url: PAGE_SHORTCUT_ORIGINS });
  await Promise.all(tabs.map(async (tab) => {
    if (tab.id === undefined) return;
    await browser.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: [SCRIPT_FILE] })
      .catch(() => undefined); // Protected pages, a closing tab, or a frame without access.
  }));
}

/** Pin only the sender's active tab after checking the current binding and website permission. */
export function runPagePinShortcut(engine: Engine, pressed: unknown, sender: Browser.runtime.MessageSender): Promise<unknown> {
  return engine.enqueue(async () => {
    const shortcut = await pinShortcutItem.getValue();
    if (!isPageShortcut(pressed) || !isPageShortcut(shortcut) || !matchesPageShortcut(pressed, shortcut)) return;
    if (!await browser.permissions.contains({ origins: PAGE_SHORTCUT_ORIGINS })) return;
    const tabId = sender.tab?.id;
    if (tabId === undefined) return;
    const tab = await browser.tabs.get(tabId);
    if (!tab.active) return;
    return execute({ type: 'togglePin', tabId, windowId: tab.windowId });
  });
}
