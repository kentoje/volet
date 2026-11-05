import { browser } from 'wxt/browser';

/** Call `onChange` whenever anything a window's sidebar shows may have changed. */
export function watchWindow(windowId: number, onChange: () => void): void {
  const mine = (id: number | undefined) => {
    if (id === windowId) onChange();
  };
  browser.tabs.onCreated.addListener((tab) => mine(tab.windowId));
  browser.tabs.onUpdated.addListener((_id, _info, tab) => mine(tab.windowId));
  browser.tabs.onRemoved.addListener((_id, info) => mine(info.windowId));
  browser.tabs.onMoved.addListener((_id, info) => mine(info.windowId));
  browser.tabs.onActivated.addListener((info) => mine(info.windowId));
  browser.tabs.onAttached.addListener((_id, info) => mine(info.newWindowId));
  browser.tabs.onDetached.addListener((_id, info) => mine(info.oldWindowId));
  browser.tabs.onReplaced.addListener(onChange);
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
