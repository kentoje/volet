import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { Favorite, LiveTab, Pin, PinnedNode, SidebarStore, Space, SpaceId, TabId } from '../../model/types';
import { seedFavorites, seedSpaces, seedTabs } from './seed';

const LOAD_MS = 600;

/** In-memory store with realistic data, for building the UI without Chrome. */
export class FakeSidebarStore implements SidebarStore {
  spaces = $state<Space[]>(seedSpaces());
  favorites = $state<Favorite[]>(seedFavorites());
  tabs = new SvelteMap<TabId, LiveTab>(seedTabs().map((tab) => [tab.id, tab]));
  activeSpaceId = $state<SpaceId>('work');
  activeTabId = $state<TabId | undefined>(21);
  collapsedFolders = new SvelteSet<string>(['trips']);

  #nextTabId = 1000;
  /** Not reactive on purpose: only read when switching Spaces. */
  #lastActiveBySpace: Record<SpaceId, TabId> = {};

  get #activeSpace(): Space {
    return this.spaces.find((space) => space.id === this.activeSpaceId) ?? this.spaces[0]!;
  }

  activateTab(tabId: TabId): void {
    this.activeTabId = tabId;
    this.#lastActiveBySpace[this.activeSpaceId] = tabId;
  }

  openPin(pinId: string): void {
    const pin = this.#findPin(pinId);
    if (!pin) return;
    pin.tabId ??= this.#openTab(pin.url, pin.title);
    this.activateTab(pin.tabId);
  }

  openFavorite(favoriteId: string): void {
    const favorite = this.favorites.find((f) => f.id === favoriteId);
    if (!favorite) return;
    favorite.tabId ??= this.#openTab(favorite.url, favorite.title);
    this.activateTab(favorite.tabId);
  }

  closeTab(tabId: TabId): void {
    for (const space of this.spaces) {
      const index = space.tabIds.indexOf(tabId);
      if (index === -1) continue;
      space.tabIds.splice(index, 1);
      if (this.activeTabId === tabId) {
        const neighbor = space.tabIds[index] ?? space.tabIds[index - 1];
        this.#activateOrClear(neighbor);
      }
    }
    this.tabs.delete(tabId);
  }

  unloadPin(pinId: string): void {
    const pin = this.#findPin(pinId);
    if (pin?.tabId === undefined) return;
    const tabId = pin.tabId;
    pin.tabId = undefined;
    this.tabs.delete(tabId);
    if (this.activeTabId === tabId) this.#activateOrClear(this.#activeSpace.tabIds.at(-1));
  }

  resetPin(pinId: string): void {
    const pin = this.#findPin(pinId);
    if (pin?.tabId === undefined) return;
    this.#load(pin.tabId, pin.url, pin.title);
  }

  toggleMute(tabId: TabId): void {
    this.#patch(tabId, (tab) => ({ muted: !tab.muted }));
  }

  newTab(): void {
    const id = this.#nextTabId++;
    this.tabs.set(id, { id, title: 'New Tab', url: 'chrome://newtab/', status: 'complete' });
    this.#activeSpace.tabIds.push(id);
    this.activateTab(id);
  }

  clearTemporary(spaceId: SpaceId): void {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (!space) return;
    const cleared = space.tabIds.splice(0);
    for (const id of cleared) this.tabs.delete(id);
    if (this.activeTabId !== undefined && cleared.includes(this.activeTabId)) this.#activateOrClear(undefined);
  }

  switchSpace(spaceId: SpaceId): void {
    if (spaceId === this.activeSpaceId) return;
    this.activeSpaceId = spaceId;
    const remembered = this.#lastActiveBySpace[spaceId];
    this.activeTabId = remembered !== undefined && this.tabs.has(remembered) ? remembered : undefined;
  }

  createSpace(): void {
    // Step around the color wheel by the golden angle so new Spaces stay distinct.
    const hue = Math.round((this.spaces.at(-1)!.hue + 137.5) % 360);
    const id = `space-${Date.now()}`;
    this.spaces.push({ id, name: `Space ${this.spaces.length + 1}`, hue, pinned: [], tabIds: [] });
    this.switchSpace(id);
  }

  toggleFolder(folderId: string): void {
    if (this.collapsedFolders.has(folderId)) this.collapsedFolders.delete(folderId);
    else this.collapsedFolders.add(folderId);
  }

  #openTab(url: string, title: string): TabId {
    const id = this.#nextTabId++;
    this.tabs.set(id, { id, title, url, status: 'complete' });
    this.#load(id, url, title);
    return id;
  }

  /** Simulate a page load so loading states are visible in the prototype. */
  #load(tabId: TabId, url: string, title: string): void {
    this.#patch(tabId, () => ({ status: 'loading', url }));
    setTimeout(() => this.#patch(tabId, () => ({ status: 'complete', title })), LOAD_MS);
  }

  /** Tabs are replaced, never mutated: the same way Chrome's events will deliver them. */
  #patch(tabId: TabId, change: (tab: LiveTab) => Partial<LiveTab>): void {
    const tab = this.tabs.get(tabId);
    if (tab) this.tabs.set(tabId, { ...tab, ...change(tab) });
  }

  #activateOrClear(tabId: TabId | undefined): void {
    if (tabId === undefined) this.activeTabId = undefined;
    else this.activateTab(tabId);
  }

  #findPin(pinId: string): Pin | undefined {
    const search = (nodes: PinnedNode[]): Pin | undefined => {
      for (const node of nodes) {
        if (node.kind === 'pin' && node.id === pinId) return node;
        if (node.kind === 'folder') {
          const found = search(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    for (const space of this.spaces) {
      const found = search(space.pinned);
      if (found) return found;
    }
    return undefined;
  }
}
