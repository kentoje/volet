import { bindingsItem, lastPagesItem } from './storage';

/** Remember the page a pin's or favorite's tab is on (see `lastPagesItem`). */
export async function rememberPage(tabId: number, url: string): Promise<void> {
  const binding = (await bindingsItem.getValue())[tabId];
  if (!binding) return;
  const pages = await lastPagesItem.getValue();
  if (pages[binding.id] === url) return;
  await lastPagesItem.setValue({ ...pages, [binding.id]: url });
}

/** Forget the pages of pins and favorites that are gone. */
export async function prunePages(liveIds: ReadonlySet<string>): Promise<void> {
  const pages = await lastPagesItem.getValue();
  const kept = Object.entries(pages).filter(([id]) => liveIds.has(id));
  if (kept.length < Object.keys(pages).length) await lastPagesItem.setValue(Object.fromEntries(kept));
}
