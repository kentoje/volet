import { browser } from 'wxt/browser';
import { changesSnapshot } from './load-snapshot';
import { type TabChange, isLiveChange } from './tab-overlay';

interface WindowWatchers {
  /** Anything the window's sidebar shows may have changed. */
  onChange: () => void;
  /**
   * A tab in this window reported new values (before any refresh reads them). `live`: the change
   * only touches what its row shows (see `isLiveChange`), and no refresh follows.
   */
  onTabUpdated?: (tabId: number, change: TabChange, live: boolean) => void;
  onTabRemoved?: (tabId: number) => void;
}

/** Follow every Chrome event that can change what one window's sidebar shows. */
export function watchWindow(windowId: number, { onChange, onTabUpdated, onTabRemoved }: WindowWatchers): void {
  const mine = (id: number | undefined) => {
    if (id === windowId) onChange();
  };
  browser.tabs.onCreated.addListener((tab) => mine(tab.windowId));
  browser.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (tab.windowId !== windowId) return;
    const live = isLiveChange(change);
    onTabUpdated?.(tabId, change, live);
    if (!live) onChange();
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
  browser.storage.onChanged.addListener((changes, area) => {
    if (changesSnapshot(changes, area)) onChange();
  });
}
