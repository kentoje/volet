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

/** An action's result: resolves once the store shows the change (immediately for synchronous stores). */
export type Done = void | Promise<void>;

/** Everything the sidebar renders and can do. Implemented by the Chrome store and the fake store. */
export interface SidebarStore {
  readonly spaces: Space[];
  readonly favorites: Favorite[];
  readonly tabs: ReadonlyMap<TabId, LiveTab>;
  readonly activeSpaceId: SpaceId;
  readonly activeTabId: TabId | undefined;
  readonly collapsedFolders: ReadonlySet<string>;

  // Tabs
  activateTab(tabId: TabId): Done;
  closeTab(tabId: TabId): Done;
  toggleMute(tabId: TabId): Done;
  newTab(): Done;
  clearTemporary(spaceId: SpaceId): Done;
  /** Move a temporary tab (or a favorite's tab) to a Space, at an index among its temporary tabs. */
  moveTab(tabId: TabId, spaceId: SpaceId, index?: number): Done;

  // Pins and folders
  openPin(pinId: string): Done;
  /** Close a pin's tab but keep the pin. */
  unloadPin(pinId: string): Done;
  /** Navigate a pin's tab back to its home URL. */
  resetPin(pinId: string): Done;
  /** Make the page a pin's tab is on its new home. */
  setPinHome(pinId: string): Done;
  /** Save a tab as a pin in a Space (parentId = Space id) or folder. */
  pinTab(tabId: TabId, parentId: string, index?: number): Done;
  /** Remove a pin, keeping its page open as a temporary tab. */
  unpin(pinId: string, spaceId: SpaceId, index?: number): Done;
  /** Move a pin or folder into a Space or folder. */
  moveNode(id: string, parentId: string, index?: number): Done;
  renameNode(id: string, title: string): Done;
  /** Delete a pin or folder; open tabs stay as temporary tabs. */
  deleteNode(id: string): Done;
  createFolder(parentId: string): Done;
  toggleFolder(folderId: string): Done;

  // Favorites
  openFavorite(favoriteId: string): Done;
  addFavorite(tabId: TabId, index?: number): Done;
  moveFavorite(favoriteId: string, index: number): Done;
  removeFavorite(favoriteId: string): Done;

  // Spaces
  switchSpace(spaceId: SpaceId): Done;
  createSpace(): Done;
  renameSpace(spaceId: SpaceId, name: string): Done;
  setSpaceHue(spaceId: SpaceId, hue: number): Done;
  moveSpace(spaceId: SpaceId, index: number): Done;
  deleteSpace(spaceId: SpaceId): Done;
}
