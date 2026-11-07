import { sameUrl } from '../model/url';
import type { PinNode } from './snapshot';

/**
 * The pin or favorite a tab on `url` belongs to, once Volet has forgotten which tab is whose (restarting Chrome or
 * reloading the extension clears that). Among the `candidates` no other tab has (`taken`): one whose own page it
 * is, else one whose tab was last on that page (`lastPages`, see `lastPagesItem`), so a tab that left its pin's or
 * favorite's page still finds it instead of becoming a new one. Own pages come first: a remembered page can be old.
 */
export function ownerOf<T extends PinNode>(
  candidates: readonly T[],
  url: string,
  lastPages: Readonly<Record<string, string>>,
  taken: ReadonlySet<string>,
): T | undefined {
  const free = candidates.filter((bookmark) => !taken.has(bookmark.id));
  const wasOn = (bookmark: T) => {
    const page = lastPages[bookmark.id];
    return page !== undefined && sameUrl(page, url);
  };
  return free.find((bookmark) => sameUrl(bookmark.url, url)) ?? free.find(wasOn);
}
