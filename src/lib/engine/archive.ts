import { browser, type Browser } from 'wxt/browser';
import { tabUrl } from './context';
import { retry } from './retry';
import { ensureRoot } from './root';
import { stampActivity } from './session';
import { type BookmarkNode, type GroupInfo, spaceFolders, spaceOfGroup } from './snapshot';
import {
  ARCHIVE_LIMIT,
  type ArchiveEntry,
  type Binding,
  archiveItem,
  bindingsItem,
  groupSpacesItem,
  settingsItem,
  tabActivityItem,
} from './storage';

interface IdleInput {
  tabs: Browser.tabs.Tab[];
  activity: Record<string, number>;
  bindings: Record<string, Binding>;
  limitMs: number;
  now: number;
}

/** Which tabs have been idle too long. Pure, so the rules are easy to test. */
export function idleTabs({ tabs, activity, bindings, limitMs, now }: IdleInput): Browser.tabs.Tab[] {
  return tabs.filter((tab) => {
    if (tab.id === undefined || tab.active || tab.pinned || tab.audible || bindings[tab.id]) return false;
    const url = tabUrl(tab);
    if (!url || url.startsWith('chrome://newtab')) return false;
    const seen = activity[tab.id];
    return seen !== undefined && now - seen >= limitMs;
  });
}

/** Close temporary tabs idle for longer than the setting, saving them to the archive. */
export async function archiveIdleTabs(now = Date.now()): Promise<void> {
  const tabs = await browser.tabs.query({});
  // The tabs in front of the user count as in use right now.
  await stampActivity(tabs.filter((tab) => tab.active).map((tab) => tab.id!), now);

  const activity = await tabActivityItem.getValue();
  // First sighting of a tab starts its clock.
  await stampActivity(tabs.filter((tab) => tab.id !== undefined && activity[tab.id] === undefined).map((t) => t.id!), now);

  const { archiveAfterHours } = await settingsItem.getValue();
  if (!archiveAfterHours) return;
  const idle = idleTabs({
    tabs,
    activity,
    bindings: await bindingsItem.getValue(),
    limitMs: archiveAfterHours * 3_600_000,
    now,
  });
  if (idle.length === 0) return;

  const spaceName = await spaceNamer();
  const entries: ArchiveEntry[] = idle.map((tab) => ({
    id: `${now}-${tab.id}`,
    title: tab.title || tabUrl(tab)!,
    url: tabUrl(tab)!,
    spaceName: spaceName(tab.groupId),
    archivedAt: now,
  }));
  const archive = await archiveItem.getValue();
  await archiveItem.setValue([...entries, ...archive].slice(0, ARCHIVE_LIMIT));
  await retry(() => browser.tabs.remove(idle.map((tab) => tab.id!)));
}

async function spaceNamer(): Promise<(groupId: number) => string> {
  const ids = await ensureRoot();
  const root: BookmarkNode = (await browser.bookmarks.getSubTree(ids.rootId))[0]!;
  const spaces = spaceFolders(root, ids.favoritesId);
  const groups: GroupInfo[] = await browser.tabGroups.query({});
  const groupSpaces = await groupSpacesItem.getValue();
  return (groupId) => {
    const spaceId = spaceOfGroup(groupId, groups, groupSpaces, spaces);
    return spaces.find((space) => space.id === spaceId)?.title ?? '';
  };
}
