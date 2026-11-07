import { browser } from 'wxt/browser';
import { websiteAccess } from './enabled';

const SCRIPT_ID = 'recent-tab-switcher';
const SCRIPT_FILE = '/recent-tabs.js';
const PAGES = ['http://*/*', 'https://*/*'];

/** Register before navigation while Chrome grants site access, unregister otherwise. Returns whether it's registered. */
export async function syncRecentTabsRegistration(): Promise<boolean> {
  const access = await websiteAccess();
  const registered = await browser.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (!access) {
    if (registered.length) await browser.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
    return false;
  }
  if (!registered.length) {
    await browser.scripting.registerContentScripts([{
      id: SCRIPT_ID,
      js: [SCRIPT_FILE],
      matches: PAGES,
      runAt: 'document_start',
    }]);
  }
  return true;
}

/**
 * Attach to pages opened before the opt-in. Keep it out of the engine queue: it waits on every page, and one that
 * never finishes loading would hold every command. Injecting immediately, like the registered `document_start`
 * script, doesn't wait for a loading page to become idle.
 */
export async function attachToOpenPages(): Promise<void> {
  const tabs = await browser.tabs.query({ url: PAGES });
  await Promise.allSettled(tabs.flatMap((tab) => tab.id === undefined ? [] : [
    browser.scripting.executeScript({ target: { tabId: tab.id }, files: [SCRIPT_FILE], injectImmediately: true }),
  ]));
}

/** Remove already loaded listeners too; unregistering only affects future pages. Out of the queue, like attaching. */
export async function detachFromOpenPages(): Promise<void> {
  const tabs = await browser.tabs.query({});
  await Promise.allSettled(tabs.flatMap((tab) => tab.id === undefined ? [] : [
    browser.tabs.sendMessage(tab.id, { type: 'recent-tabs:disable' }),
  ]));
}
