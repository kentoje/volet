import { asUrl, rank } from '@/lib/engine/palette/rank';
import type { PaletteClient, PaletteItem } from '@/lib/model/palette';
import type { PinnedNode, SidebarStore } from '@/lib/model/types';
import { hostOf } from '@/lib/model/url';

const pinsIn = (nodes: PinnedNode[]): Extract<PinnedNode, { kind: 'pin' }>[] =>
  nodes.flatMap((node) => (node.kind === 'pin' ? [node] : pinsIn(node.children)));

/** Palette over the fake store's content, for the prototype. */
export function fakePaletteClient(store: SidebarStore): PaletteClient {
  const candidates = (): PaletteItem[] => {
    const list: PaletteItem[] = [];
    for (const space of store.spaces) {
      for (const id of space.tabIds) {
        const tab = store.tabs.get(id);
        if (!tab) continue;
        list.push({ id: `tab:${id}`, kind: 'tab', title: tab.title, detail: `${space.name} · ${hostOf(tab.url)}`, url: tab.url, ref: id });
      }
    }
    for (const favorite of store.favorites) {
      list.push({ id: `favorite:${favorite.id}`, kind: 'favorite', title: favorite.title, detail: hostOf(favorite.url), url: favorite.url, ref: favorite.id });
    }
    for (const space of store.spaces) {
      for (const pin of pinsIn(space.pinned)) {
        list.push({ id: `pin:${pin.id}`, kind: 'pin', title: pin.title, detail: `${space.name} · ${hostOf(pin.url)}`, url: pin.url, ref: pin.id });
      }
      if (space.id !== store.activeSpaceId) {
        list.push({ id: `space:${space.id}`, kind: 'space', title: `Switch to ${space.name}`, hue: space.hue, ref: space.id });
      }
    }
    list.push({ id: 'action:new-tab', kind: 'action', title: 'New tab', detail: 'In this Space', ref: 'new-tab' });
    list.push({ id: 'action:new-space', kind: 'action', title: 'New Space', ref: 'new-space' });
    return list;
  };

  return {
    async search(text) {
      const items = rank(text, candidates());
      const url = asUrl(text);
      if (url) items.unshift({ id: 'open-url', kind: 'open-url', title: `Open ${url}`, url, ref: url });
      if (text.trim()) items.push({ id: 'search', kind: 'search', title: `Search for “${text.trim()}”`, ref: text });
      const hue = store.spaces.find((space) => space.id === store.activeSpaceId)?.hue ?? 268;
      return { items, hue };
    },
    async run(item) {
      const ref = String(item.ref);
      if (item.kind === 'tab') await store.activateTab(Number(item.ref));
      else if (item.kind === 'pin') await store.openPin(ref);
      else if (item.kind === 'favorite') await store.openFavorite(ref);
      else if (item.kind === 'space') await store.switchSpace(ref);
      else if (item.ref === 'new-space') await store.createSpace();
      else if (item.kind !== 'search') await store.newTab();
    },
  };
}
