import { browser } from 'wxt/browser';
import { sameUrl } from '../model/url';
import { tabUrl } from './context';
import { bindingsItem, namedTitlesItem } from './storage';

/*
 * A pin or favorite shows its bookmark's title. Unless the user named it, that title follows the
 * page: each time its tab finishes loading the bookmark's own URL, the bookmark takes the page's
 * title. (An Arc import can bring titles saved while a page was broken, like "Page not found".)
 */

/** Identifies a named bookmark by what syncs across devices (unlike its id): short hash of URL and title. */
export function titleSignature(url: string, title: string): string {
  let hash = 0x811c9dc5; // FNV-1a, 32 bits
  for (const char of `${url}\n${title}`) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

interface TitleInput {
  bookmark: { url: string; title: string };
  tab: { url: string | undefined; title: string | undefined };
  named: ReadonlySet<string>;
}

/** The bookmark's new title, if it should take the page's. Pure. */
export function refreshedTitle({ bookmark, tab, named }: TitleInput): string | undefined {
  const title = tab.title?.trim();
  if (!title || !tab.url || title === bookmark.title) return undefined;
  if (!sameUrl(tab.url, bookmark.url)) return undefined; // the tab is on another page now
  // Pages without a title show their address: not worth a title.
  if (tab.url.includes(title)) return undefined;
  if (named.has(titleSignature(bookmark.url, bookmark.title))) return undefined;
  return title;
}

/** Whether the user chose this bookmark's title. */
export async function isNamed(bookmark: { url: string; title: string }): Promise<boolean> {
  return (await namedTitlesItem.getValue()).includes(titleSignature(bookmark.url, bookmark.title));
}

/** Remember titles the user chose, so pages never replace them. */
export async function markNamed(bookmarks: { url: string; title: string }[]): Promise<void> {
  if (bookmarks.length === 0) return;
  const named = new Set(await namedTitlesItem.getValue());
  for (const { url, title } of bookmarks) named.add(titleSignature(url, title));
  await namedTitlesItem.setValue([...named]);
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
    named: new Set(await namedTitlesItem.getValue()),
  });
  if (title) await browser.bookmarks.update(bookmark.id, { title });
}
