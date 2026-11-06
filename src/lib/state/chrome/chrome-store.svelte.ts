import { EMPTY_STATE, derive, type SidebarState } from '@/lib/engine/derive';
import type { Command } from '@/lib/engine/protocol';
import { collapsedItem } from '@/lib/engine/storage';
import type { Favorite, Folder, LiveTab, SidebarStore, Space, SpaceId, SpaceItem, TabId } from '@/lib/model/types';
import { reuseContent } from '../reuse';
import * as tree from '../tree';
import { watchWindow } from './chrome-events';
import { sayHello, sendCommand } from './command-client';
import { loadSnapshot } from './load-snapshot';
import { RefreshGate } from './refresh-gate';
import { TabOverlay } from './tab-overlay';

const NEW_FOLDER_TITLE = 'New folder';

/**
 * The sidebar's view of Chrome for one window. Reads come straight from Chrome;
 * every write is a command run by the service worker. Each action applies an
 * optimistic update first, then resolves once the store shows Chrome's real state.
 */
export class ChromeSidebarStore implements SidebarStore {
  // Raw state: replaced, never mutated. A refresh keeps the objects that didn't change (see reuse.ts).
  spaces = $state.raw<Space[]>(EMPTY_STATE.spaces);
  favorites = $state.raw<Favorite[]>(EMPTY_STATE.favorites);
  tabs = $state.raw<ReadonlyMap<TabId, LiveTab>>(EMPTY_STATE.tabs);
  activeSpaceId = $state<SpaceId>(EMPTY_STATE.activeSpaceId);
  activeTabId = $state<TabId | undefined>(EMPTY_STATE.activeTabId);
  collapsedFolders = $state.raw<ReadonlySet<string>>(EMPTY_STATE.collapsedFolders);

  readonly windowId: number;
  #gate: RefreshGate<SidebarState>;
  #overlay = new TabOverlay();
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(windowId: number) {
    this.windowId = windowId;
    this.#gate = new RefreshGate(
      async () => derive(await loadSnapshot(windowId)),
      (state) => this.#apply(state),
    );
  }

  /** Load the initial state and start following Chrome. */
  async start(): Promise<void> {
    watchWindow(this.windowId, {
      onChange: () => this.#scheduleRefresh(),
      onTabUpdated: (tabId, change) => this.#overlay.record(tabId, change),
      onTabRemoved: (tabId) => this.#overlay.forget(tabId),
    });
    await this.#gate.request();
    // Let the service worker tidy this window (and create the bookmark folders on first run).
    void sayHello(this.windowId)
      .catch(() => undefined)
      .then(() => this.#scheduleRefresh());
  }

  #scheduleRefresh(): void {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.#gate.request(), 16);
  }

  #apply(state: SidebarState): void {
    // Event values win over a lagging tabs.query (see TabOverlay). Whatever didn't change keeps
    // its object, so the rows showing it have nothing to do.
    const next = reuseContent(this, { ...state, tabs: this.#overlay.apply(state.tabs) });
    this.spaces = next.spaces;
    this.favorites = next.favorites;
    this.tabs = next.tabs;
    this.activeSpaceId = next.activeSpaceId;
    this.activeTabId = next.activeTabId;
    this.collapsedFolders = next.collapsedFolders;
  }

  /** Apply `optimistic` now, run the command, and resolve once Chrome's state is shown. */
  async #run(command: Command, optimistic?: () => void): Promise<unknown> {
    let value: unknown;
    try {
      value = await this.#gate.during(() => {
        optimistic?.();
        return sendCommand(command);
      });
    } catch (error) {
      console.error(`Command ${command.type} failed:`, error);
    }
    await this.#gate.request();
    return value;
  }

  /** A tab leaving favorites or a pin: unlink it there (the engine does the same). */
  #releaseTab(tabId: TabId): void {
    this.favorites = this.favorites.filter((favorite) => favorite.tabId !== tabId);
    const pin = this.spaces.flatMap((space) => tree.findPinByTab(space.pinned, tabId))[0];
    if (pin) this.spaces = tree.withPinTab(this.spaces, pin.id, undefined);
  }

  // ───────────────────────────── tabs ─────────────────────────────

  async activateTab(tabId: TabId) {
    await this.#run({ type: 'activateTab', tabId }, () => (this.activeTabId = tabId));
  }

  async closeTab(tabId: TabId) {
    await this.#run({ type: 'closeTab', windowId: this.windowId, tabId }, () => {
      this.spaces = tree.withoutTab(this.spaces, tabId);
    });
  }

  async toggleMute(tabId: TabId) {
    await this.#run({ type: 'toggleMute', tabId });
  }

  async newTab() {
    await this.#run({ type: 'newTab', windowId: this.windowId, spaceId: this.activeSpaceId });
  }

  async clearTemporary(spaceId: SpaceId) {
    await this.#run({ type: 'clearTemporary', windowId: this.windowId, spaceId }, () => {
      this.spaces = tree.withTemporaryCleared(this.spaces, spaceId);
    });
  }

  async moveTab(tabId: TabId, spaceId: SpaceId, index?: number) {
    await this.#run({ type: 'moveTab', windowId: this.windowId, tabId, spaceId, index }, () => {
      this.#releaseTab(tabId);
      this.spaces = tree.placeTemporary(this.spaces, tabId, spaceId, index);
    });
  }

  // ───────────────────────────── pins and folders ─────────────────────────────

  async openPin(pinId: string) {
    const tabId = tree.findPin(this.spaces, pinId)?.tabId;
    await this.#run({ type: 'openPin', windowId: this.windowId, pinId }, () => {
      if (tabId !== undefined) this.activeTabId = tabId;
    });
  }

  async unloadPin(pinId: string) {
    await this.#run({ type: 'unloadPin', windowId: this.windowId, pinId }, () => {
      this.spaces = tree.withPinTab(this.spaces, pinId, undefined);
    });
  }

  async resetPin(pinId: string) {
    await this.#run({ type: 'resetPin', windowId: this.windowId, pinId });
  }

  async setPinHome(pinId: string) {
    await this.#run({ type: 'setHome', windowId: this.windowId, id: pinId });
  }

  async pinTab(tabId: TabId, parentId: string, index?: number) {
    const tab = this.tabs.get(tabId);
    await this.#run({ type: 'pinTab', windowId: this.windowId, tabId, parentId, index }, () => {
      if (!tab) return;
      this.#releaseTab(tabId);
      const pin = { kind: 'pin', id: `pending-${tabId}`, title: tab.title, url: tab.url, tabId } as const;
      this.spaces = tree.pinTemporary(this.spaces, pin, parentId, index);
    });
  }

  async unpin(pinId: string, spaceId: SpaceId, index?: number) {
    await this.#run({ type: 'unpin', windowId: this.windowId, pinId, spaceId, index }, () => {
      this.spaces = tree.unpinNode(this.spaces, pinId, spaceId, index);
    });
  }

  async moveNode(id: string, parentId: string, index?: number) {
    await this.#run({ type: 'moveBookmark', id, parentId, index }, () => {
      this.spaces = tree.moveNode(this.spaces, id, parentId, index);
    });
  }

  async renameNode(id: string, title: string) {
    await this.#run({ type: 'renameBookmark', id, title }, () => {
      this.spaces = tree.renameNode(this.spaces, id, title);
    });
  }

  async deleteNode(id: string) {
    await this.#run({ type: 'deleteBookmark', windowId: this.windowId, id }, () => {
      this.spaces = tree.deleteNode(this.spaces, id);
    });
  }

  async createFolder(parentId: string) {
    const id = await this.#run({ type: 'createFolder', parentId, index: 0, title: NEW_FOLDER_TITLE });
    return typeof id === 'string' ? id : undefined;
  }

  async createFolderWith(items: SpaceItem[], parentId: string, index?: number) {
    const title = NEW_FOLDER_TITLE;
    const id = await this.#run({ type: 'createFolderWith', windowId: this.windowId, parentId, index, title, items }, () => {
      const folder: Folder = { kind: 'folder', id: 'pending-folder', title, children: [] };
      for (const item of items) if (item.kind === 'tab') this.#releaseTab(item.id);
      this.spaces = tree.fillNewFolder(this.spaces, folder, parentId, index, items, (tabId) => {
        const tab = this.tabs.get(tabId);
        return tab && { kind: 'pin', id: `pending-${tabId}`, title: tab.title, url: tab.url, tabId };
      });
    });
    return typeof id === 'string' ? id : undefined;
  }

  async toggleFolder(folderId: string) {
    this.collapsedFolders = tree.toggled(this.collapsedFolders, folderId);
    // Purely visual state: written directly, no need for the service worker.
    await collapsedItem.setValue([...this.collapsedFolders]);
  }

  // ───────────────────────────── favorites ─────────────────────────────

  async openFavorite(favoriteId: string) {
    const tabId = this.favorites.find((favorite) => favorite.id === favoriteId)?.tabId;
    await this.#run({ type: 'openFavorite', windowId: this.windowId, favoriteId }, () => {
      if (tabId !== undefined) this.activeTabId = tabId;
    });
  }

  async addFavorite(tabId: TabId, index?: number) {
    const tab = this.tabs.get(tabId);
    await this.#run({ type: 'addFavorite', windowId: this.windowId, tabId, index }, () => {
      if (!tab) return;
      this.#releaseTab(tabId);
      this.spaces = tree.withoutTab(this.spaces, tabId);
      const favorite = { id: `pending-${tabId}`, title: tab.title, url: tab.url, tabId };
      this.favorites = tree.insertFavorite(this.favorites, favorite, index);
    });
  }

  async favoritePin(pinId: string, index?: number) {
    await this.#run({ type: 'favoritePin', windowId: this.windowId, pinId, index }, () => {
      ({ spaces: this.spaces, favorites: this.favorites } = tree.pinToFavorite(this.spaces, this.favorites, pinId, index));
    });
  }

  async moveFavorite(favoriteId: string, index: number) {
    await this.#run({ type: 'moveFavorite', favoriteId, index }, () => {
      this.favorites = tree.moveItem(this.favorites, (favorite) => favorite.id === favoriteId, index);
    });
  }

  async removeFavorite(favoriteId: string) {
    const tabId = this.favorites.find((favorite) => favorite.id === favoriteId)?.tabId;
    await this.#run({ type: 'removeFavorite', windowId: this.windowId, favoriteId }, () => {
      this.favorites = this.favorites.filter((favorite) => favorite.id !== favoriteId);
      if (tabId !== undefined) this.spaces = tree.placeTemporary(this.spaces, tabId, this.activeSpaceId);
    });
  }

  async setFavoriteHome(favoriteId: string) {
    await this.#run({ type: 'setHome', windowId: this.windowId, id: favoriteId });
  }

  // ───────────────────────────── Spaces ─────────────────────────────

  async switchSpace(spaceId: SpaceId) {
    if (spaceId === this.activeSpaceId) return;
    await this.#run({ type: 'switchSpace', windowId: this.windowId, spaceId }, () => (this.activeSpaceId = spaceId));
  }

  async createSpace() {
    await this.#run({ type: 'createSpace', windowId: this.windowId });
  }

  async renameSpace(spaceId: SpaceId, name: string) {
    await this.#run({ type: 'renameSpace', spaceId, name }, () => {
      this.spaces = tree.updateSpace(this.spaces, spaceId, { name });
    });
  }

  async setSpaceHue(spaceId: SpaceId, hue: number) {
    await this.#run({ type: 'setSpaceHue', spaceId, hue }, () => {
      this.spaces = tree.updateSpace(this.spaces, spaceId, { hue });
    });
  }

  async moveSpace(spaceId: SpaceId, index: number) {
    await this.#run({ type: 'moveSpace', spaceId, index }, () => {
      this.spaces = tree.moveItem(this.spaces, (space) => space.id === spaceId, index);
    });
  }

  async deleteSpace(spaceId: SpaceId) {
    await this.#run({ type: 'deleteSpace', windowId: this.windowId, spaceId }, () => {
      const index = this.spaces.findIndex((space) => space.id === spaceId);
      this.spaces = this.spaces.filter((space) => space.id !== spaceId);
      if (this.activeSpaceId === spaceId) {
        this.activeSpaceId = (this.spaces[index] ?? this.spaces[index - 1])?.id ?? '';
      }
    });
  }
}
