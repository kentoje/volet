import { browser, type Browser } from 'wxt/browser';
import { groupColorFor } from './colors';
import { type Context, activeSpaceOf, findSpace, groupOf, hueOf } from './context';
import { retry } from './retry';
import { setGroupSpace } from './session';
import { spaceOfGroup } from './snapshot';
import { groupSpacesItem } from './storage';

/** Put tabs into the Space's tab group in this window, creating the group if needed. */
export async function groupTabs(ctx: Context, spaceId: string, tabIds: number[]): Promise<number | undefined> {
  if (tabIds.length === 0) return groupOf(ctx, spaceId);
  const space = findSpace(ctx, spaceId);
  if (!space) return undefined;

  const existing = groupOf(ctx, spaceId);
  const ids = tabIds as [number, ...number[]];
  const groupId = await retry(() =>
    browser.tabs.group(
      existing !== undefined
        ? { tabIds: ids, groupId: existing }
        : { tabIds: ids, createProperties: { windowId: ctx.windowId } },
    ),
  );
  if (existing === undefined) {
    const group = await retry(() =>
      browser.tabGroups.update(groupId, {
        title: space.title,
        color: groupColorFor(hueOf(ctx, spaceId)),
        collapsed: spaceId !== activeSpaceOf(ctx),
      }),
    );
    if (group) ctx.groups.push(group);
  }
  await setGroupSpace(ctx, groupId, spaceId);
  for (const tab of ctx.tabs) if (tab.id !== undefined && tabIds.includes(tab.id)) tab.groupId = groupId;
  return groupId;
}

/**
 * Collapse every Space group in the window except the active one, and the one holding the tab in
 * front (a page parked there): Chrome would pick another tab, or open one, to collapse it.
 */
export async function collapseOtherSpaces(ctx: Context, activeSpaceId: string): Promise<void> {
  const [front] = await browser.tabs.query({ windowId: ctx.windowId, active: true });
  for (const group of ctx.groups) {
    const spaceId = spaceOfGroup(group.id, ctx.groups, ctx.groupSpaces, ctx.spaces);
    if (spaceId === undefined) continue;
    const collapsed = spaceId !== activeSpaceId && group.id !== front?.groupId;
    if (group.collapsed !== collapsed) await retry(() => browser.tabGroups.update(group.id, { collapsed }));
  }
}

/** Update the title or color of a Space's groups in every window. */
export async function updateSpaceGroups(
  spaceId: string,
  change: { title?: string; color?: Browser.tabGroups.UpdateProperties['color'] },
): Promise<void> {
  const groupSpaces = await groupSpacesItem.getValue();
  for (const [groupId, mapped] of Object.entries(groupSpaces)) {
    if (mapped !== spaceId) continue;
    await retry(() => browser.tabGroups.update(Number(groupId), change)).catch(() => undefined); // may be gone
  }
}
