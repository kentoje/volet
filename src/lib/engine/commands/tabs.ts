import { browser } from 'wxt/browser';
import { activeSpaceOf, loadContext, temporaryTabs } from '../context';
import { collapseOtherSpaces } from '../groups';
import { retry } from '../retry';
import { setBinding } from '../session';
import { keepActiveInSpace, openTabIn, placeTab, releaseFavorite } from '../tab-ops';
import type { Handlers } from './types';

export const tabHandlers = {
  async activateTab({ tabId }) {
    await retry(() => browser.tabs.update(tabId, { active: true }));
  },

  async focusTab({ tabId }) {
    const tab = await browser.tabs.get(tabId);
    await browser.windows.update(tab.windowId, { focused: true });
    await retry(() => browser.tabs.update(tabId, { active: true }));
  },

  async closeTab({ windowId, tabId }) {
    const ctx = await loadContext(windowId);
    await keepActiveInSpace(ctx, [tabId]);
    await retry(() => browser.tabs.remove(tabId));
  },

  async toggleMute({ tabId }) {
    const tab = await browser.tabs.get(tabId);
    await browser.tabs.update(tabId, { muted: !tab.mutedInfo?.muted });
  },

  async newTab({ windowId, spaceId, url }) {
    const ctx = await loadContext(windowId);
    return (await openTabIn(ctx, spaceId ?? activeSpaceOf(ctx), url)).id;
  },

  async openUrl({ windowId, url }) {
    const ctx = await loadContext(windowId);
    return (await openTabIn(ctx, activeSpaceOf(ctx), url)).id;
  },

  async search({ text }) {
    // The new tab lands ungrouped; reconcile moves it into the active Space.
    await browser.search.query({ text, disposition: 'NEW_TAB' });
  },

  async clearTemporary({ windowId, spaceId }) {
    const ctx = await loadContext(windowId);
    const ids = temporaryTabs(ctx, spaceId).map((tab) => tab.id!);
    if (ids.length === 0) return;
    await keepActiveInSpace(ctx, ids);
    await retry(() => browser.tabs.remove(ids));
  },

  async moveTab({ windowId, tabId, spaceId, index }) {
    const ctx = await loadContext(windowId);
    const tab = ctx.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    await releaseFavorite(ctx, tabId);
    if (tab.pinned) await retry(() => browser.tabs.update(tabId, { pinned: false }));
    if (ctx.bindings[tabId]) await setBinding(ctx, tabId, undefined);
    const leavingActiveSpace = spaceId !== activeSpaceOf(ctx);
    if (leavingActiveSpace) await keepActiveInSpace(ctx, [tabId]);
    await placeTab(ctx, tabId, spaceId, index);
    if (leavingActiveSpace) await collapseOtherSpaces(ctx, activeSpaceOf(ctx));
  },
} satisfies Partial<Handlers>;
