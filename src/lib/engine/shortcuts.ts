import { browser, type Browser } from 'wxt/browser';
import type { Engine } from './engine';
import { pendingPaletteItem } from './storage';

/** Pages an extension can't run scripts in: the palette opens in the side panel instead. */
const NO_SCRIPTS = /^(chrome|chrome-extension|chrome-search|chrome-untrusted|devtools|edge|brave|about|view-source):/i;
const WEB_STORE = /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i;

export const PALETTE_SCRIPT = '/palette.js';

/** Keyboard shortcuts declared in the manifest's `commands`. */
export function listenForShortcuts(engine: Engine): void {
  browser.commands.onCommand.addListener((command, tab) => {
    const windowId = tab?.windowId;
    switch (command) {
      case 'open-palette':
        openPalette(tab);
        break;
      case 'next-space':
      case 'previous-space':
        if (windowId !== undefined) {
          void engine.run({ type: 'shiftSpace', windowId, offset: command === 'next-space' ? 1 : -1 });
        }
        break;
      case 'toggle-pin':
        if (windowId !== undefined && tab?.id !== undefined) {
          void engine.run({ type: 'togglePin', windowId, tabId: tab.id });
        }
        break;
    }
  });
}

/** Show the palette over the page (the shortcut grants temporary access), or in the side panel. */
function openPalette(tab: Browser.tabs.Tab | undefined): void {
  if (tab?.windowId === undefined) return;
  const url = tab.url ?? '';
  if (tab.id === undefined || !url || NO_SCRIPTS.test(url) || WEB_STORE.test(url)) {
    openInPanel(tab.windowId); // synchronous: sidePanel.open only works during the shortcut's gesture
    return;
  }
  browser.scripting
    .executeScript({ target: { tabId: tab.id }, files: [PALETTE_SCRIPT] })
    .catch(() => openInPanel(tab.windowId)); // e.g. file:// pages without file access
}

function openInPanel(windowId: number): void {
  browser.sidePanel.open({ windowId }).catch(() => undefined);
  void pendingPaletteItem.getValue().then((pending) => pendingPaletteItem.setValue({ ...pending, [windowId]: true }));
}
