import { browser } from 'wxt/browser';
import { RECENT_TABS_PERMISSION } from '@/lib/model/recent-tabs';
import { hasRecentTabShortcut } from '@/lib/model/recent-tab-shortcut';
import { recentTabsOnItem } from './switcher-preference';

/** Site access: granted at install, but users can withhold it in Chrome's details for Volet. The page script needs it. */
export function websiteAccess(): Promise<boolean> {
  return browser.permissions.contains(RECENT_TABS_PERMISSION);
}

/** Requires the user's toggle, an assigned shortcut, and site access; disabled switchers take no new previews. */
export async function recentTabsEnabled(): Promise<boolean> {
  if (!(await recentTabsOnItem.getValue())) return false;
  const [access, commands] = await Promise.all([websiteAccess(), browser.commands.getAll()]);
  return access && hasRecentTabShortcut(commands);
}
