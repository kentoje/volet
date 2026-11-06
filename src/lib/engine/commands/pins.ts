import { browser } from 'wxt/browser';
import {
  activeSpaceOf,
  boundTab,
  boundTabIds,
  loadContext,
  reloadRoot,
  spaceOfTab,
  tabUrl,
} from '../context';
import { collapseOtherSpaces, groupTabs } from '../groups';
import { retry } from '../retry';
import { setActiveSpace, setBinding } from '../session';
import { findBookmark, spaceOfBookmark, spaceOfGroup } from '../snapshot';
import { keepActiveInSpace, placeTab, releaseFavorite } from '../tab-ops';
import { deleteBookmark } from './bookmarks';
import type { CommandOf, Handlers } from './types';

/** Save a tab as a pin in a Space folder (or subfolder), keeping the tab bound to it. */
export async function pinTab({ windowId, tabId, parentId, index }: CommandOf<'pinTab'>): Promise<string | undefined> {
  const ctx = await loadContext(windowId);
  const tab = ctx.tabs.find((t) => t.id === tabId);
  const url = tab && tabUrl(tab);
  if (!tab || !url) return;
  await releaseFavorite(ctx, tabId);
  if (tab.pinned) await retry(() => browser.tabs.update(tabId, { pinned: false }));
  const pin = await browser.bookmarks.create({ parentId, index, title: tab.title || url, url });
  await setBinding(ctx, tabId, { kind: 'pin', id: pin.id });
  await reloadRoot(ctx);
  const spaceId = spaceOfBookmark(ctx.root, pin.id);
  // Compare with the tab's actual group: asking spaceOfTab would answer through the new pin.
  const groupSpace = spaceOfGroup(tab.groupId, ctx.groups, ctx.groupSpaces, ctx.spaces);
  if (spaceId && spaceId !== groupSpace) await groupTabs(ctx, spaceId, [tabId]);
  return pin.id;
}

/** Remove a pin, keeping its tab (or opening one) as a temporary tab at `index`. */
export async function unpin({ windowId, pinId, spaceId, index }: CommandOf<'unpin'>): Promise<void> {
  const ctx = await loadContext(windowId);
  const pin = findBookmark(ctx.root, pinId);
  if (!pin?.url) return;
  let tabId = boundTab(ctx, pinId)?.id;
  if (tabId === undefined) {
    const tab = await browser.tabs.create({ windowId, url: pin.url, active: false });
    ctx.tabs.push(tab);
    tabId = tab.id!;
  }
  for (const id of boundTabIds(ctx, pinId)) await setBinding(ctx, id, undefined);
  await browser.bookmarks.remove(pinId);
  await reloadRoot(ctx);
  await placeTab(ctx, tabId, spaceId, index);
}

export const pinHandlers = {
  /** Focus the pin's tab, or open it (switching to the pin's Space if needed). */
  async openPin({ windowId, pinId }) {
    const ctx = await loadContext(windowId);
    const bound = boundTab(ctx, pinId);
    if (bound?.id !== undefined) {
      await retry(() => browser.tabs.update(bound.id!, { active: true }));
      return bound.id;
    }
    const pin = findBookmark(ctx.root, pinId);
    const spaceId = spaceOfBookmark(ctx.root, pinId);
    if (!pin?.url || !spaceId) return;
    const tab = await browser.tabs.create({ windowId, url: pin.url, active: true });
    ctx.tabs.push(tab);
    await setBinding(ctx, tab.id!, { kind: 'pin', id: pin.id });
    await groupTabs(ctx, spaceId, [tab.id!]);
    if (spaceId !== activeSpaceOf(ctx)) {
      await setActiveSpace(ctx, spaceId);
      await collapseOtherSpaces(ctx, spaceId);
    }
    return tab.id;
  },

  /** Close the pin's tab; the pin stays. */
  async unloadPin({ windowId, pinId }) {
    const ctx = await loadContext(windowId);
    const bound = boundTab(ctx, pinId);
    if (bound?.id === undefined) return;
    await keepActiveInSpace(ctx, [bound.id]);
    // Close first, unbind after: never show the closing tab as a temporary tab.
    await retry(() => browser.tabs.remove(bound.id!));
    await setBinding(ctx, bound.id, undefined);
  },

  /** Navigate the pin's tab back to its home URL. */
  async resetPin({ windowId, pinId }) {
    const ctx = await loadContext(windowId);
    const bound = boundTab(ctx, pinId);
    const pin = findBookmark(ctx.root, pinId);
    if (bound?.id !== undefined && pin?.url) await browser.tabs.update(bound.id, { url: pin.url });
  },

  async togglePin({ windowId, tabId }) {
    const ctx = await loadContext(windowId);
    const binding = ctx.bindings[tabId];
    if (binding?.kind === 'favorite') {
      return deleteBookmark({ type: 'deleteBookmark', windowId, id: binding.id });
    }
    const tab = ctx.tabs.find((t) => t.id === tabId);
    const pinSpace = binding?.kind === 'pin' ? spaceOfBookmark(ctx.root, binding.id) : undefined;
    if (binding?.kind === 'pin' && pinSpace) {
      return unpin({ type: 'unpin', windowId, pinId: binding.id, spaceId: pinSpace });
    }
    const spaceId = (tab && spaceOfTab(ctx, tab)) || activeSpaceOf(ctx);
    return pinTab({ type: 'pinTab', windowId, tabId, parentId: spaceId });
  },

  pinTab,
  unpin,
} satisfies Partial<Handlers>;
