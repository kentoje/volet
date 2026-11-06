import { type Context, LAST_SPACE_KEY } from './context';
import {
  type Binding,
  activeSpacesItem,
  bindingsItem,
  groupSpacesItem,
  lastActiveItem,
  parkedTabsItem,
  tabActivityItem,
} from './storage';

/** Writes to the session-only links between tabs, groups, Spaces and windows. */

export async function setBinding(ctx: Context, tabId: number, binding: Binding | undefined): Promise<void> {
  const next = { ...ctx.bindings };
  if (binding) next[tabId] = binding;
  else delete next[tabId];
  ctx.bindings = next;
  await bindingsItem.setValue(next);
}

export async function setGroupSpace(ctx: Context, groupId: number, spaceId: string): Promise<void> {
  if (ctx.groupSpaces[groupId] === spaceId) return;
  ctx.groupSpaces = { ...ctx.groupSpaces, [groupId]: spaceId };
  await groupSpacesItem.setValue(ctx.groupSpaces);
}

export async function setActiveSpace(ctx: Context, spaceId: string): Promise<void> {
  if (ctx.activeSpaces[ctx.windowId] === spaceId && ctx.activeSpaces[LAST_SPACE_KEY] === spaceId) return;
  ctx.activeSpaces = { ...ctx.activeSpaces, [ctx.windowId]: spaceId, [LAST_SPACE_KEY]: spaceId };
  await activeSpacesItem.setValue(ctx.activeSpaces);
}

/** Remember the tab last used in a Space, to return to it when switching back. */
export async function rememberActive(windowId: number, spaceId: string, tabId: number): Promise<void> {
  const all = await lastActiveItem.getValue();
  if (all[windowId]?.[spaceId] === tabId) return;
  await lastActiveItem.setValue({ ...all, [windowId]: { ...all[windowId], [spaceId]: tabId } });
}

export async function lastActiveTab(windowId: number, spaceId: string): Promise<number | undefined> {
  return (await lastActiveItem.getValue())[windowId]?.[spaceId];
}

/** Leave `tabId` in front while the window shows another Space (see `parkedTabsItem`). */
export async function park(windowId: number, tabId: number): Promise<void> {
  await parkedTabsItem.setValue({ ...(await parkedTabsItem.getValue()), [windowId]: tabId });
}

export async function parkedTab(windowId: number): Promise<number | undefined> {
  return (await parkedTabsItem.getValue())[windowId];
}

/** Stop leaving a tab in front of another Space. Returns the tab that was parked, if any. */
export async function unpark(windowId: number): Promise<number | undefined> {
  const parked = await parkedTab(windowId);
  if (parked !== undefined) await removeKey(parkedTabsItem, windowId);
  return parked;
}

export async function stampActivity(tabIds: number[], now = Date.now()): Promise<void> {
  if (tabIds.length === 0) return;
  const activity = await tabActivityItem.getValue();
  await tabActivityItem.setValue({ ...activity, ...Object.fromEntries(tabIds.map((id) => [id, now])) });
}

export async function forgetTab(tabId: number): Promise<void> {
  await removeKey(bindingsItem, tabId);
  await removeKey(tabActivityItem, tabId);
}

/** Chrome sometimes swaps a tab for a new id (prerendering, discarding): keep its binding. */
export async function replaceTab(addedTabId: number, removedTabId: number): Promise<void> {
  const bindings = await bindingsItem.getValue();
  const binding = bindings[removedTabId];
  if (!binding) return;
  const { [removedTabId]: _old, ...rest } = bindings;
  await bindingsItem.setValue({ ...rest, [addedTabId]: binding });
}

export async function forgetGroup(groupId: number): Promise<void> {
  await removeKey(groupSpacesItem, groupId);
}

export async function forgetWindow(windowId: number): Promise<void> {
  await removeKey(activeSpacesItem, windowId);
  await removeKey(lastActiveItem, windowId);
  await removeKey(parkedTabsItem, windowId);
}

async function removeKey<T>(
  item: { getValue(): Promise<Record<string, T>>; setValue(value: Record<string, T>): Promise<void> },
  key: number | string,
): Promise<void> {
  const value = await item.getValue();
  if (!(key in value)) return;
  const { [key]: _removed, ...rest } = value;
  await item.setValue(rest);
}
