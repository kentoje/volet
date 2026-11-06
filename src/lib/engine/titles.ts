import { browser } from 'wxt/browser';
import { sameUrl } from '../model/url';
import { tabUrl } from './context';
import { autoTitlesItem, bindingsItem } from './storage';

/*
 * A pin or favorite shows its bookmark's title. While that title is still the one Volet gave it
 * from its page (pinning a tab, an import, an earlier refresh), it follows the page: each time its
 * tab finishes loading the bookmark's own URL, the bookmark takes the page's title. Once anyone
 * changes it (a rename in Volet or in Chrome's bookmarks, a custom name from Arc), it's theirs and
 * never changes again. A title Volet didn't give (one from before, or from another device) counts
 * as theirs too.
 */

interface TitleInput {
  bookmark: { url: string; title: string };
  tab: { url: string | undefined; title: string | undefined };
  /** The title Volet last gave this bookmark, if any. */
  auto: string | undefined;
}

/** The bookmark's new title, if it should take the page's. Pure. */
export function refreshedTitle({ bookmark, tab, auto }: TitleInput): string | undefined {
  if (auto === undefined || auto !== bookmark.title) return undefined; // someone named it
  const title = tab.title?.trim();
  if (!title || !tab.url || title === bookmark.title) return undefined;
  if (!sameUrl(tab.url, bookmark.url)) return undefined; // the tab is on another page now
  // Pages without a title show their address: not worth a title.
  if (tab.url.includes(title)) return undefined;
  return title;
}

/** Remember the titles Volet gave these bookmarks from their pages: they may follow the page. */
export async function rememberAutoTitles(bookmarks: { id: string; title: string }[]): Promise<void> {
  if (bookmarks.length === 0) return;
  const auto = { ...(await autoTitlesItem.getValue()) };
  for (const { id, title } of bookmarks) auto[id] = title;
  await autoTitlesItem.setValue(auto);
}

/** Whether the bookmark still has the title Volet gave it (no one renamed it since). */
export async function hasAutoTitle(bookmark: { id: string; title: string }): Promise<boolean> {
  return (await autoTitlesItem.getValue())[bookmark.id] === bookmark.title;
}

/** When a pin's or favorite's tab has loaded, give its bookmark the page's title (see above). */
export async function refreshBoundTitle(tabId: number): Promise<void> {
  const binding = (await bindingsItem.getValue())[tabId];
  if (!binding) return;
  const tab = await browser.tabs.get(tabId).catch(() => undefined);
  const [bookmark] = await browser.bookmarks.get(binding.id).catch(() => []);
  if (!tab || !bookmark?.url) return;
  const title = refreshedTitle({
    bookmark: { url: bookmark.url, title: bookmark.title },
    tab: { url: tabUrl(tab), title: tab.title },
    auto: (await autoTitlesItem.getValue())[bookmark.id],
  });
  if (!title) return;
  await browser.bookmarks.update(bookmark.id, { title });
  await rememberAutoTitles([{ id: bookmark.id, title }]);
}
