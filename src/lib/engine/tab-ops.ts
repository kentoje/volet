import { browser } from 'wxt/browser';
import { type Context, type Tab, activeSpaceOf, reloadTabs, spaceTabs, temporaryTabs } from './context';
import { groupTabs } from './groups';
import { retry } from './retry';
import { setBinding } from './session';

/** Open a tab inside a Space (in its tab group). */
export async function openTabIn(ctx: Context, spaceId: string, url?: string, active = true): Promise<Tab> {
  const tab = await browser.tabs.create({ windowId: ctx.windowId, url, active });
  ctx.tabs.push(tab);
  await groupTabs(ctx, spaceId, [tab.id!]);
  return tab;
}

/**
 * Before tabs close or leave the active Space: if one of them is the active tab,
 * activate a neighbor in the same Space (or a new tab) so Chrome doesn't jump
 * into another Space.
 */
export async function keepActiveInSpace(ctx: Context, leaving: number[]): Promise<void> {
  const active = ctx.tabs.find((tab) => tab.active);
  if (active?.id === undefined || !leaving.includes(active.id)) return;
  const spaceId = activeSpaceOf(ctx);
  const candidates = spaceTabs(ctx, spaceId).filter((tab) => !leaving.includes(tab.id!));
  const replacement = candidates.find((tab) => tab.index > active.index) ?? candidates.at(-1);
  if (replacement?.id !== undefined) await retry(() => browser.tabs.update(replacement.id!, { active: true }));
  else await openTabIn(ctx, spaceId);
}

/** Move a tab to a position among a Space's temporary tabs (index omitted = end). */
export async function placeTab(ctx: Context, tabId: number, spaceId: string, index?: number): Promise<void> {
  await groupTabs(ctx, spaceId, [tabId]);
  await reloadTabs(ctx);
  const moving = ctx.tabs.find((tab) => tab.id === tabId);
  if (!moving || index === undefined) return;
  const others = temporaryTabs(ctx, spaceId).filter((tab) => tab.id !== tabId);
  const anchor = others[index];
  // Past the last one: grouping put a tab from elsewhere at the end, but one already in the group
  // (a pin's tab) stays where it was, maybe before some of them.
  const last = others.at(-1);
  if (!anchor && (!last || moving.index > last.index)) return;
  // Chrome's target index counts the tab's own slot when it moves to the right.
  const target = anchor ? (moving.index < anchor.index ? anchor.index - 1 : anchor.index) : last!.index;
  if (target !== moving.index) await retry(() => browser.tabs.move(tabId, { index: target }));
}

/** A favorite's tab that moves into a Space (as a pin or temporary tab) is no longer a favorite. */
export async function releaseFavorite(ctx: Context, tabId: number): Promise<void> {
  const binding = ctx.bindings[tabId];
  if (binding?.kind !== 'favorite') return;
  await setBinding(ctx, tabId, undefined);
  await browser.bookmarks.remove(binding.id).catch(() => undefined);
}
