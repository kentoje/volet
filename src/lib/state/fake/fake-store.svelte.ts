import { nextHue } from '@/lib/engine/colors';
import type { Favorite, Folder, LiveTab, SidebarStore, Space, SpaceId, SpaceItem, TabId } from '@/lib/model/types';
import * as tree from '../tree';
import { seedCollapsed, seedFavorites, seedSpaces, seedTabMap } from './seed';

const LOAD_MS = 600;

/**
 * In-memory store with realistic data, for building the UI without Chrome.
 * Built on the same pure tree operations as the Chrome store's optimistic updates.
 */
export class FakeSidebarStore implements SidebarStore {
  spaces = $state.raw<Space[]>(seedSpaces());
  favorites = $state.raw<Favorite[]>(seedFavorites());
  tabs = $state.raw<ReadonlyMap<TabId, LiveTab>>(seedTabMap());
  activeSpaceId = $state<SpaceId>('work');
  activeTabId = $state<TabId | undefined>(21);
  collapsedFolders = $state.raw<ReadonlySet<string>>(seedCollapsed());

  #nextId = 1000;
  /** Not reactive on purpose: only read when switching Spaces. */
  #lastActiveBySpace: Record<SpaceId, TabId> = {};

  // ───────────────────────────── tabs ─────────────────────────────

  activateTab(tabId: TabId) {
    this.activeTabId = tabId;
    this.#lastActiveBySpace[this.activeSpaceId] = tabId;
  }

  closeTab(tabId: TabId) {
    const space = this.spaces.find((s) => s.tabIds.includes(tabId));
    if (space && this.activeTabId === tabId) {
      const index = space.tabIds.indexOf(tabId);
      this.#activateOrClear(space.tabIds[index + 1] ?? space.tabIds[index - 1]);
    }
    this.spaces = tree.withoutTab(this.spaces, tabId);
    this.#setTab(tabId, undefined);
  }

  toggleMute(tabId: TabId) {
    const tab = this.tabs.get(tabId);
    if (tab) this.#setTab(tabId, { ...tab, muted: !tab.muted });
  }

  newTab() {
    const id = this.#createTab('chrome://newtab/', 'New Tab', false);
    this.spaces = tree.placeTemporary(this.spaces, id, this.activeSpaceId);
    this.activateTab(id);
  }

  clearTemporary(spaceId: SpaceId) {
    const cleared = this.spaces.find((space) => space.id === spaceId)?.tabIds ?? [];
    this.spaces = tree.withTemporaryCleared(this.spaces, spaceId);
    for (const id of cleared) this.#setTab(id, undefined);
    if (this.activeTabId !== undefined && cleared.includes(this.activeTabId)) this.#activateOrClear(undefined);
  }

  moveTab(tabId: TabId, spaceId: SpaceId, index?: number) {
    this.#release(tabId);
    this.spaces = tree.placeTemporary(this.spaces, tabId, spaceId, index);
  }

  // ───────────────────────────── pins and folders ─────────────────────────────

  openPin(pinId: string) {
    const pin = tree.findPin(this.spaces, pinId);
    if (!pin) return;
    const space = tree.spaceOfNode(this.spaces, pinId);
    if (space) this.switchSpace(space.id);
    const tabId = pin.tabId ?? this.#createTab(pin.url, pin.title);
    this.spaces = tree.withPinTab(this.spaces, pinId, tabId);
    this.activateTab(tabId);
  }

  unloadPin(pinId: string) {
    const tabId = tree.findPin(this.spaces, pinId)?.tabId;
    if (tabId === undefined) return;
    this.spaces = tree.withPinTab(this.spaces, pinId, undefined);
    this.#setTab(tabId, undefined);
    if (this.activeTabId === tabId) this.#activateOrClear(undefined);
  }

  resetPin(pinId: string) {
    const pin = tree.findPin(this.spaces, pinId);
    if (pin?.tabId !== undefined) this.#load(pin.tabId, pin.url, pin.title);
  }

  setPinHome(pinId: string) {
    const pin = tree.findPin(this.spaces, pinId);
    const tab = pin?.tabId !== undefined ? this.tabs.get(pin.tabId) : undefined;
    if (!tab) return;
    this.spaces = this.spaces.map((space) => ({
      ...space,
      pinned: tree.mapPins(space.pinned, (p) => (p.id === pinId ? { ...p, url: tab.url } : p)),
    }));
  }

  pinTab(tabId: TabId, parentId: string, index?: number) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    this.#release(tabId);
    const pin = { kind: 'pin', id: `pin-${this.#nextId++}`, title: tab.title, url: tab.url, tabId } as const;
    this.spaces = tree.pinTemporary(this.spaces, pin, parentId, index);
  }

  unpin(pinId: string, spaceId: SpaceId, index?: number) {
    const pin = tree.findPin(this.spaces, pinId);
    if (!pin) return;
    // Unpinning an unloaded pin opens its page.
    if (pin.tabId === undefined) this.spaces = tree.withPinTab(this.spaces, pinId, this.#createTab(pin.url, pin.title));
    this.spaces = tree.unpinNode(this.spaces, pinId, spaceId, index);
  }

  moveNode(id: string, parentId: string, index?: number) {
    this.spaces = tree.moveNode(this.spaces, id, parentId, index);
  }

  renameNode(id: string, title: string) {
    this.spaces = tree.renameNode(this.spaces, id, title);
  }

  deleteNode(id: string) {
    this.spaces = tree.deleteNode(this.spaces, id);
  }

  createFolder(parentId: string) {
    const folder: Folder = { kind: 'folder', id: `folder-${this.#nextId++}`, title: 'New folder', children: [] };
    this.spaces = tree.insertNode(this.spaces, folder, parentId, 0);
    return folder.id;
  }

  createFolderWith(items: SpaceItem[], parentId: string, index?: number) {
    const folder: Folder = { kind: 'folder', id: `folder-${this.#nextId++}`, title: 'New folder', children: [] };
    for (const item of items) if (item.kind === 'tab') this.#release(item.id);
    this.spaces = tree.fillNewFolder(this.spaces, folder, parentId, index, items, (tabId) => {
      const tab = this.tabs.get(tabId);
      return tab && { kind: 'pin', id: `pin-${this.#nextId++}`, title: tab.title, url: tab.url, tabId };
    });
    return folder.id;
  }

  toggleFolder(folderId: string) {
    this.collapsedFolders = tree.toggled(this.collapsedFolders, folderId);
  }

  // ───────────────────────────── favorites ─────────────────────────────

  openFavorite(favoriteId: string) {
    const favorite = this.favorites.find((f) => f.id === favoriteId);
    if (!favorite) return;
    const tabId = favorite.tabId ?? this.#createTab(favorite.url, favorite.title);
    this.favorites = this.favorites.map((f) => (f.id === favoriteId ? { ...f, tabId } : f));
    this.activateTab(tabId);
  }

  addFavorite(tabId: TabId, index?: number) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    this.#release(tabId);
    this.spaces = tree.withoutTab(this.spaces, tabId);
    const favorite = { id: `fav-${this.#nextId++}`, title: tab.title, url: tab.url, tabId };
    this.favorites = tree.insertFavorite(this.favorites, favorite, index);
  }

  favoritePin(pinId: string, index?: number) {
    ({ spaces: this.spaces, favorites: this.favorites } = tree.pinToFavorite(this.spaces, this.favorites, pinId, index));
  }

  moveFavorite(favoriteId: string, index: number) {
    this.favorites = tree.moveItem(this.favorites, (favorite) => favorite.id === favoriteId, index);
  }

  removeFavorite(favoriteId: string) {
    const tabId = this.favorites.find((favorite) => favorite.id === favoriteId)?.tabId;
    this.favorites = this.favorites.filter((favorite) => favorite.id !== favoriteId);
    if (tabId !== undefined) this.spaces = tree.placeTemporary(this.spaces, tabId, this.activeSpaceId);
  }

  setFavoriteHome(favoriteId: string) {
    const favorite = this.favorites.find((candidate) => candidate.id === favoriteId);
    const tab = favorite?.tabId !== undefined ? this.tabs.get(favorite.tabId) : undefined;
    if (!tab) return;
    this.favorites = this.favorites.map((f) => (f.id === favoriteId ? { ...f, url: tab.url, title: tab.title } : f));
  }

  // ───────────────────────────── Spaces ─────────────────────────────

  switchSpace(spaceId: SpaceId) {
    if (spaceId === this.activeSpaceId) return;
    this.activeSpaceId = spaceId;
    const remembered = this.#lastActiveBySpace[spaceId];
    this.activeTabId = remembered !== undefined && this.tabs.has(remembered) ? remembered : undefined;
  }

  createSpace() {
    const id = `space-${this.#nextId++}`;
    const hue = nextHue(this.spaces.map((space) => space.hue));
    this.spaces = [...this.spaces, { id, name: `Volet ${this.spaces.length + 1}`, hue, pinned: [], tabIds: [] }];
    this.switchSpace(id);
  }

  renameSpace(spaceId: SpaceId, name: string) {
    this.spaces = tree.updateSpace(this.spaces, spaceId, { name });
  }

  setSpaceHue(spaceId: SpaceId, hue: number) {
    this.spaces = tree.updateSpace(this.spaces, spaceId, { hue });
  }

  moveSpace(spaceId: SpaceId, index: number) {
    this.spaces = tree.moveItem(this.spaces, (space) => space.id === spaceId, index);
  }

  deleteSpace(spaceId: SpaceId) {
    if (this.spaces.length < 2) return;
    const index = this.spaces.findIndex((space) => space.id === spaceId);
    this.spaces = this.spaces.filter((space) => space.id !== spaceId);
    if (this.activeSpaceId === spaceId) this.switchSpace((this.spaces[index] ?? this.spaces[index - 1])!.id);
  }

  // ───────────────────────────── internals ─────────────────────────────

  /** Unlink a tab from a favorite or pin, as the engine does when it moves elsewhere. */
  #release(tabId: TabId) {
    this.favorites = this.favorites.filter((favorite) => favorite.tabId !== tabId);
    const pin = this.spaces.flatMap((space) => tree.findPinByTab(space.pinned, tabId))[0];
    if (pin) this.spaces = tree.withPinTab(this.spaces, pin.id, undefined);
  }

  #createTab(url: string, title: string, load = true): TabId {
    const id = this.#nextId++;
    this.#setTab(id, { id, title, url, status: 'complete' });
    if (load) this.#load(id, url, title);
    return id;
  }

  /** Simulate a page load so loading states are visible in the prototype. */
  #load(tabId: TabId, url: string, title: string) {
    this.#patch(tabId, { status: 'loading', url });
    setTimeout(() => this.#patch(tabId, { status: 'complete', title }), LOAD_MS);
  }

  #patch(tabId: TabId, change: Partial<LiveTab>) {
    const tab = this.tabs.get(tabId);
    if (tab) this.#setTab(tabId, { ...tab, ...change });
  }

  #setTab(tabId: TabId, tab: LiveTab | undefined) {
    this.tabs = tree.withKey(this.tabs, tabId, tab);
  }

  #activateOrClear(tabId: TabId | undefined) {
    if (tabId === undefined) this.activeTabId = undefined;
    else this.activateTab(tabId);
  }
}
