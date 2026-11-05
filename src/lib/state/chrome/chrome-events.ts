import { browser } from 'wxt/browser';
import type { TabChange } from './tab-overlay';

export interface WindowWatchers {
  /** Anything the window's sidebar shows may have changed. */
  onChange: () => void;
  /** A tab in this window reported new values (before any refresh reads them). */
  onTabUpdated?: (tabId: number, change: TabChange) => void;
  onTabRemoved?: (tabId: number) => void;
}

/** Follow every Chrome event that can change what one window's sidebar shows. */
export function watchWindow(windowId: number, { onChange, onTabUpdated, onTabRemoved }: WindowWatchers): void {
  const mine = (id: number | undefined) => {
    if (id === windowId) onChange();
  };
  browser.tabs.onCreated.addListener((tab) => mine(tab.windowId));
  browser.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (tab.windowId === windowId) onTabUpdated?.(tabId, change);
    mine(tab.windowId);
  });
  browser.tabs.onRemoved.addListener((tabId, info) => {
    onTabRemoved?.(tabId);
    mine(info.windowId);
  });
  browser.tabs.onMoved.addListener((_id, info) => mine(info.windowId));
  browser.tabs.onActivated.addListener((info) => mine(info.windowId));
  browser.tabs.onAttached.addListener((_id, info) => mine(info.newWindowId));
  browser.tabs.onDetached.addListener((_id, info) => mine(info.oldWindowId));
  browser.tabs.onReplaced.addListener((_added, removed) => {
    onTabRemoved?.(removed);
    onChange();
  });
  browser.tabGroups.onCreated.addListener((group) => mine(group.windowId));
  browser.tabGroups.onUpdated.addListener((group) => mine(group.windowId));
  browser.tabGroups.onRemoved.addListener((group) => mine(group.windowId));
  // Bookmarks and storage are shared by every window.
  browser.bookmarks.onCreated.addListener(onChange);
  browser.bookmarks.onRemoved.addListener(onChange);
  browser.bookmarks.onChanged.addListener(onChange);
  browser.bookmarks.onMoved.addListener(onChange);
  browser.bookmarks.onChildrenReordered.addListener(onChange);
  browser.storage.onChanged.addListener(onChange);
}
