import { hostOf } from '../../model/url';
import type { ArchiveEntry } from '../schema';
import { type BookmarkNode, findBookmark, pinsIn } from '../snapshot';
import type { PaletteItem } from './types';

export interface CandidateInput {
  /** Tabs of every window, the current window's active Space first. */
  tabs: { id: number; title: string; url: string; spaceName?: string; boundTo?: string }[];
  spaces: { id: string; title: string; hue: number; node: BookmarkNode }[];
  activeSpaceId: string;
  favoritesFolder: BookmarkNode | undefined;
  archive: ArchiveEntry[];
}

const ACTIONS: PaletteItem[] = [
  { id: 'action:new-tab', kind: 'action', title: 'New tab', detail: 'In this Space', ref: 'new-tab' },
  { id: 'action:new-space', kind: 'action', title: 'New Space', ref: 'new-space' },
  { id: 'action:clear-tabs', kind: 'action', title: 'Clear unpinned tabs', detail: 'In this Space', ref: 'clear-tabs' },
];

/** Everything the palette can find, in the order shown for an empty query. Pure. */
export function candidates(input: CandidateInput): PaletteItem[] {
  const items: PaletteItem[] = [];

  // Open tabs (tabs that belong to a pin or favorite are listed as that pin or favorite).
  for (const tab of input.tabs) {
    if (tab.boundTo) continue;
    items.push({
      id: `tab:${tab.id}`,
      kind: 'tab',
      title: tab.title,
      detail: tab.spaceName ? `${tab.spaceName} · ${hostOf(tab.url)}` : hostOf(tab.url),
      url: tab.url,
      ref: tab.id,
    });
  }

  for (const favorite of (input.favoritesFolder?.children ?? []).filter((node) => node.url)) {
    items.push({ id: `favorite:${favorite.id}`, kind: 'favorite', title: favorite.title, detail: hostOf(favorite.url!), url: favorite.url, ref: favorite.id });
  }

  for (const space of input.spaces) {
    for (const pin of pinsIn(space.node)) {
      items.push({ id: `pin:${pin.id}`, kind: 'pin', title: pin.title, detail: `${space.title} · ${hostOf(pin.url!)}`, url: pin.url, ref: pin.id });
    }
  }

  for (const space of input.spaces) {
    if (space.id === input.activeSpaceId) continue;
    items.push({ id: `space:${space.id}`, kind: 'space', title: `Switch to ${space.title}`, hue: space.hue, ref: space.id });
  }

  items.push(...ACTIONS);

  for (const entry of input.archive) {
    items.push({
      id: `archived:${entry.id}`,
      kind: 'archived',
      title: entry.title,
      detail: [entry.spaceName, hostOf(entry.url)].filter(Boolean).join(' · '),
      url: entry.url,
      ref: entry.id,
    });
  }
  return items;
}

/** True if a bookmark id is a pin or favorite under the root (used to skip bound tabs). */
export function isSaved(root: BookmarkNode | undefined, id: string | undefined): boolean {
  return id !== undefined && findBookmark(root, id) !== undefined;
}
