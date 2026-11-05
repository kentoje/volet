import type { LiveTab, TabId } from '@/lib/model/types';

/** The parts of chrome.tabs.onUpdated's changeInfo the sidebar shows. */
export interface TabChange {
  status?: string;
  title?: string;
  url?: string;
  favIconUrl?: string;
  audible?: boolean;
  mutedInfo?: { muted: boolean };
}

type Live = Partial<Pick<LiveTab, 'status' | 'title' | 'url' | 'favIconUrl' | 'audible' | 'muted'>>;

/**
 * Chrome's tabs.query can lag behind its own onUpdated events: right after
 * "status: complete" fires, a query may still say "loading", and on pages like the
 * New Tab page no later event ever corrects it. So the latest value each event
 * reported wins over the query for these fields. (Structure, like order and groups,
 * still comes from the query.)
 */
export class TabOverlay {
  #fields = new Map<TabId, Live>();

  record(tabId: TabId, change: TabChange): void {
    const live: Live = {};
    if (change.status !== undefined) live.status = change.status === 'loading' ? 'loading' : 'complete';
    if (change.title !== undefined) live.title = change.title;
    if (change.url !== undefined) live.url = change.url;
    if (change.favIconUrl !== undefined) live.favIconUrl = change.favIconUrl || undefined;
    if (change.audible !== undefined) live.audible = change.audible;
    if (change.mutedInfo !== undefined) live.muted = change.mutedInfo.muted;
    if (Object.keys(live).length === 0) return;
    this.#fields.set(tabId, { ...this.#fields.get(tabId), ...live });
  }

  forget(tabId: TabId): void {
    this.#fields.delete(tabId);
  }

  /** The tabs from a query, with the latest event values laid over them. */
  apply(tabs: ReadonlyMap<TabId, LiveTab>): Map<TabId, LiveTab> {
    const result = new Map(tabs);
    for (const [tabId, live] of this.#fields) {
      const tab = result.get(tabId);
      if (tab) result.set(tabId, { ...tab, ...live });
    }
    return result;
  }
}
