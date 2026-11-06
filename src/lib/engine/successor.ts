import { isNewTabPage } from '../model/url';
import type { Tab } from './context';
import { tabUrl } from './snapshot';

/**
 * What to bring to the front when the active tab leaves its Space: another tab, a new tab in the
 * Space, or nothing (Chrome picks the next tab itself).
 */
type Successor = { kind: 'tab'; tabId: number } | { kind: 'new-tab' } | { kind: 'chrome' };

interface SuccessorInput {
  /** The active tab, which is leaving. */
  active: Tab;
  /** Every tab leaving the Space (closing or moving out), the active one included. */
  leaving: Tab[];
  /** The Space's tabs in this window, in strip order. */
  spaceTabs: Tab[];
  /** The window's open favorites. They belong to no Space, so showing one keeps the Space in front. */
  favorites: Tab[];
}

/**
 * The tab to show once the active one leaves, chosen so the sidebar stays on its Space:
 * 1. a neighbor in the Space (the next one, else the last one);
 * 2. else the favorite used last: the Space stays in front, now empty, like in Arc;
 * 3. else a new tab in the Space, unless the leaving tabs are only New Tab pages: replacing one
 *    with another would make it impossible to close, so Chrome picks the next tab instead.
 */
export function successorOf({ active, leaving, spaceTabs, favorites }: SuccessorInput): Successor {
  const gone = new Set(leaving.map((tab) => tab.id));
  const neighbors = spaceTabs.filter((tab) => tab.id !== undefined && !gone.has(tab.id));
  const neighbor = neighbors.find((tab) => tab.index > active.index) ?? neighbors.at(-1);
  if (neighbor) return { kind: 'tab', tabId: neighbor.id! };

  const favorite = favorites
    .filter((tab) => tab.id !== undefined && !gone.has(tab.id))
    .reduce<Tab | undefined>((best, tab) => (!best || lastUsed(tab) > lastUsed(best) ? tab : best), undefined);
  if (favorite) return { kind: 'tab', tabId: favorite.id! };

  if (leaving.every((tab) => isNewTabPage(tabUrl(tab)))) return { kind: 'chrome' };
  return { kind: 'new-tab' };
}

function lastUsed(tab: Tab): number {
  return tab.lastAccessed ?? 0;
}
