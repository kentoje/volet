import { browser } from 'wxt/browser';
import type { Engine } from '../engine';
import { loadFaviconImage } from '../favicon';
import { forgetRecentWindow, loadRecentTabs, rememberCreatedTab, rememberRecentTab } from './history';
import { RecentTabPreviews } from './previews';
import { attachToOpenPages, detachFromOpenPages, syncRecentTabsRegistration } from './registration';

/** Wire recent-tab history, preview capture and page requests without expanding the main engine. */
export function listenForRecentTabs(engine: Engine): void {
  const previews = new RecentTabPreviews();
  const log = (error: unknown) => console.warn('Recent tabs failed', error);
  /**
   * Follow Chrome's site access: register the page script, and attach to or detach from the pages already open. It
   * doesn't follow the shortcuts, which Chrome reports no change for: without one, the script just stays idle.
   */
  const refresh = async ({ detach = true } = {}) => {
    const ready = await engine.enqueue(syncRecentTabsRegistration);
    if (ready) {
      void attachToOpenPages().catch(log);
      for (const tab of await browser.tabs.query({ active: true })) {
        if (tab.id !== undefined) previews.schedule(tab.id, tab.windowId);
      }
    } else {
      previews.clear();
      if (detach) void detachFromOpenPages().catch(log);
    }
    return ready;
  };
  // At startup, unregistering is enough: the shortcut and the previews check site access, so a script left on a
  // page from before does nothing.
  void refresh({ detach: false }).catch(log);
  browser.permissions.onAdded.addListener(() => { void refresh().catch(log); });
  browser.permissions.onRemoved.addListener(() => { void refresh().catch(log); });
  browser.tabs.onActivated.addListener(({ tabId, windowId }) => {
    void engine.enqueue(() => rememberRecentTab(tabId, windowId)).catch(log);
    previews.schedule(tabId, windowId);
  });
  browser.tabs.onCreated.addListener((tab) => {
    void engine.enqueue(() => rememberCreatedTab(tab)).catch(log);
  });
  browser.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (info.url) previews.forget(tabId);
    if (tab.active && info.status === 'complete') previews.schedule(tabId, tab.windowId);
  });
  browser.tabs.onRemoved.addListener((tabId) => previews.forget(tabId));
  browser.windows.onRemoved.addListener((windowId) => {
    void engine.enqueue(() => forgetRecentWindow(windowId)).catch(log);
  });
  browser.runtime.onMessage.addListener((message: unknown, sender, respond) => {
    if (typeof message !== 'object' || message === null || !('type' in message)) return;
    let work: Promise<unknown>;
    if (message.type === 'recent-tabs:setup') {
      // Settings open in a tab, so their sender has one too: accept Volet's own pages, never a website.
      if (!sender.url?.startsWith(`${location.origin}/`)) return;
      work = refresh().then((ready) => ({ ready }));
    } else {
      const tab = sender.tab;
      if (tab?.id === undefined || sender.frameId !== 0) return;
      if (message.type === 'recent-tabs:query') {
        work = engine.enqueue(() => loadRecentTabs(tab.windowId)).then(async (tabs) => {
          const shots = await previews.find(tabs);
          return {
            tabs: await Promise.all(tabs.map(async (recent) => ({
              ...recent,
              icon: await loadFaviconImage(recent.url),
              preview: shots.get(recent.id),
            }))),
          };
        });
      } else if ((message.type === 'recent-tabs:activate' || message.type === 'recent-tabs:close') && 'tabId' in message &&
        typeof message.tabId === 'number' && Number.isInteger(message.tabId)) {
        const tabId = message.tabId;
        const action = message.type;
        work = engine.enqueue(async () => {
          const target = await browser.tabs.get(tabId);
          if (target.windowId !== tab.windowId) throw new Error('Recent tab belongs to another window');
        }).then(() => engine.run(action === 'recent-tabs:close'
          ? { type: 'closeTab', windowId: tab.windowId, tabId }
          : { type: 'activateTab', tabId })).then(() => ({ ok: true }));
      } else return;
    }
    work.then(respond, (error: unknown) => { log(error); respond({ ok: false }); });
    return true;
  });
}
