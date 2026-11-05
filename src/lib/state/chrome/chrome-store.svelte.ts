import { EMPTY_STATE, derive, type SidebarState } from '@/lib/engine/derive';
import type { Command } from '@/lib/engine/protocol';
import { collapsedItem } from '@/lib/engine/storage';
import type { Favorite, LiveTab, SidebarStore, Space, SpaceId, TabId } from '@/lib/model/types';
import { findPin, toggled, withPinTab, withTemporaryCleared, withoutTab } from '../tree';
import { watchWindow } from './chrome-events';
import { sayHello, sendCommand } from './command-client';
import { loadSnapshot } from './load-snapshot';
import { RefreshGate } from './refresh-gate';

/**
 * The sidebar's view of Chrome for one window. Reads come straight from Chrome;
 * every write is a command run by the service worker. Actions apply an optimistic
 * update first so the UI responds instantly.
 */
export class ChromeSidebarStore implements SidebarStore {
  // Raw state: every refresh replaces these values wholesale; they are never mutated.
  spaces = $state.raw<Space[]>(EMPTY_STATE.spaces);
  favorites = $state.raw<Favorite[]>(EMPTY_STATE.favorites);
  tabs = $state.raw<ReadonlyMap<TabId, LiveTab>>(EMPTY_STATE.tabs);
  activeSpaceId = $state<SpaceId>(EMPTY_STATE.activeSpaceId);
  activeTabId = $state<TabId | undefined>(EMPTY_STATE.activeTabId);
  collapsedFolders = $state.raw<ReadonlySet<string>>(EMPTY_STATE.collapsedFolders);

  readonly windowId: number;
  #gate: RefreshGate<SidebarState>;
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
    watchWindow(this.windowId, () => this.#scheduleRefresh());
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
    this.spaces = state.spaces;
    this.favorites = state.favorites;
    this.tabs = state.tabs;
    this.activeSpaceId = state.activeSpaceId;
    this.activeTabId = state.activeTabId;
    this.collapsedFolders = state.collapsedFolders;
  }

  /** Apply `optimistic` now, then run the command in the service worker. */
  #run(command: Command, optimistic?: () => void): Promise<unknown> {
    return this.#gate
      .during(() => {
        optimistic?.();
        return sendCommand(command);
      })
      .catch((error) => console.error(`Command ${command.type} failed:`, error));
  }

  activateTab(tabId: TabId): void {
    void this.#run({ type: 'activateTab', tabId }, () => (this.activeTabId = tabId));
  }

  openPin(pinId: string): void {
    const tabId = findPin(this.spaces, pinId)?.tabId;
    void this.#run({ type: 'openPin', windowId: this.windowId, pinId }, () => {
      if (tabId !== undefined) this.activeTabId = tabId;
    });
  }

  openFavorite(favoriteId: string): void {
    const tabId = this.favorites.find((favorite) => favorite.id === favoriteId)?.tabId;
    void this.#run({ type: 'openFavorite', windowId: this.windowId, favoriteId }, () => {
      if (tabId !== undefined) this.activeTabId = tabId;
    });
  }

  closeTab(tabId: TabId): void {
    void this.#run({ type: 'closeTab', windowId: this.windowId, tabId }, () => {
      this.spaces = withoutTab(this.spaces, tabId);
    });
  }

  unloadPin(pinId: string): void {
    void this.#run({ type: 'unloadPin', windowId: this.windowId, pinId }, () => {
      this.spaces = withPinTab(this.spaces, pinId, undefined);
    });
  }

  resetPin(pinId: string): void {
    void this.#run({ type: 'resetPin', windowId: this.windowId, pinId });
  }

  toggleMute(tabId: TabId): void {
    void this.#run({ type: 'toggleMute', tabId });
  }

  newTab(): void {
    void this.#run({ type: 'newTab', windowId: this.windowId, spaceId: this.activeSpaceId });
  }

  clearTemporary(spaceId: SpaceId): void {
    void this.#run({ type: 'clearTemporary', windowId: this.windowId, spaceId }, () => {
      this.spaces = withTemporaryCleared(this.spaces, spaceId);
    });
  }

  switchSpace(spaceId: SpaceId): void {
    if (spaceId === this.activeSpaceId) return;
    void this.#run({ type: 'switchSpace', windowId: this.windowId, spaceId }, () => (this.activeSpaceId = spaceId));
  }

  createSpace(): void {
    void this.#run({ type: 'createSpace', windowId: this.windowId });
  }

  toggleFolder(folderId: string): void {
    const next = toggled(this.collapsedFolders, folderId);
    this.collapsedFolders = next;
    // Purely visual state: written directly, no need for the service worker.
    void collapsedItem.setValue([...next]);
  }
}
