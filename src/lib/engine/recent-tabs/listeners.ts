import { browser } from 'wxt/browser';
import type { Engine } from '../engine';
import {
  forgetRecentTab, forgetRecentWindow, rememberCreatedTab, rememberRecentTab, replaceRecentTab,
} from './history';
import { listenForRecentTabMessages } from './messages';
import { RecentTabPreviews } from './previews';
import { attachToOpenPagesOnce, detachFromOpenPages, forgetAttachedPages, syncRecentTabsRegistration } from './registration';

/** Wire recent-tab history, preview capture and page requests without expanding the main engine. */
export function listenForRecentTabs(engine: Engine): void {
  const previews = new RecentTabPreviews();
  const log = (error: unknown) => console.warn('Recent tabs failed', error);
  /**
   * Follow Chrome's site access: register the page script, and attach to or detach from the pages already open. It
   * doesn't follow the shortcuts, which Chrome reports no change for: without one, the script just stays idle.
   * A fresh grant (`granted`) attaches again; otherwise open pages get the script once per session.
   */
  const refresh = async ({ detach = true, granted = true } = {}) => {
    const ready = await engine.enqueue(syncRecentTabsRegistration);
    if (ready) {
      void attachToOpenPagesOnce({ always: granted }).catch(log);
      for (const tab of await browser.tabs.query({ active: true })) {
        if (tab.id !== undefined) previews.schedule(tab.id, tab.windowId);
      }
    } else {
      previews.clear();
      void forgetAttachedPages().catch(log);
      if (detach) void detachFromOpenPages().catch(log);
    }
    return ready;
  };
  // This runs each time Chrome starts the worker (it stops it after about 30 seconds idle), not only when Volet
  // starts: the pages already have the script then. Unregistering is enough without access: the shortcut and the
  // previews check site access, so a script left on a page from before does nothing.
  void refresh({ detach: false, granted: false }).catch(log);
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
    // A page loading, or a single-page app moving on without a full load (its URL alone changes): take it again.
    if (tab.active && (info.status === 'complete' || info.url)) previews.schedule(tabId, tab.windowId);
  });
  browser.tabs.onRemoved.addListener((tabId, { windowId, isWindowClosing }) => {
    previews.forget(tabId);
    // A closing window's history goes with it (`windows.onRemoved`).
    if (!isWindowClosing) void engine.enqueue(() => forgetRecentTab(tabId, windowId)).catch(log);
  });
  browser.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
    previews.forget(removedTabId);
    void engine.enqueue(() => replaceRecentTab(addedTabId, removedTabId)).catch(log);
  });
  browser.windows.onRemoved.addListener((windowId) => {
    void engine.enqueue(() => forgetRecentWindow(windowId)).catch(log);
  });
  listenForRecentTabMessages(engine, previews, () => refresh(), log);
}
