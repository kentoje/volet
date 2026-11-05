export type SpaceId = string;
export type TabId = number;

/** A live browser tab in the current window. */
export interface LiveTab {
  id: TabId;
  title: string;
  url: string;
  status: 'loading' | 'complete';
  audible?: boolean;
  muted?: boolean;
}

/** A saved pinned entry (a bookmark). `url` is its home URL. */
export interface Pin {
  kind: 'pin';
  id: string;
  title: string;
  url: string;
  /** The open tab bound to this pin in the current window, if loaded. */
  tabId?: TabId;
}

export interface Folder {
  kind: 'folder';
  id: string;
  title: string;
  children: PinnedNode[];
}

export type PinnedNode = Pin | Folder;

export interface Space {
  id: SpaceId;
  name: string;
  /** OKLCH hue (0 to 360) that tints the whole panel while the Space is active. */
  hue: number;
  pinned: PinnedNode[];
  /** Temporary tabs, in Chrome's tab order. */
  tabIds: TabId[];
}

/** A favorite: shared across all Spaces, shown in the grid at the top. */
export interface Favorite {
  id: string;
  title: string;
  url: string;
  tabId?: TabId;
}

/** Everything the sidebar renders. Implemented by the fake store now, the Chrome engine later. */
export interface SidebarStore {
  readonly spaces: Space[];
  readonly favorites: Favorite[];
  readonly tabs: ReadonlyMap<TabId, LiveTab>;
  readonly activeSpaceId: SpaceId;
  readonly activeTabId: TabId | undefined;
  readonly collapsedFolders: ReadonlySet<string>;

  activateTab(tabId: TabId): void;
  openPin(pinId: string): void;
  openFavorite(favoriteId: string): void;
  closeTab(tabId: TabId): void;
  /** Close a pin's tab but keep the pin. */
  unloadPin(pinId: string): void;
  /** Navigate a pin's tab back to its home URL. */
  resetPin(pinId: string): void;
  toggleMute(tabId: TabId): void;
  newTab(): void;
  clearTemporary(spaceId: SpaceId): void;
  switchSpace(spaceId: SpaceId): void;
  createSpace(): void;
  toggleFolder(folderId: string): void;
}
