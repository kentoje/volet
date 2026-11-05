import { browser } from 'wxt/browser';
import type { Handlers } from './types';

/** The extension's own pages. */
export const pageHandlers = {
  async openSettings() {
    await browser.runtime.openOptionsPage();
  },

  async openImport() {
    await browser.tabs.create({ url: browser.runtime.getURL('/import.html') });
  },
} satisfies Partial<Handlers>;
