/** Every change the UI can ask for. The service worker runs them one at a time. */
export type Command =
  | { type: 'activateTab'; tabId: number }
  | { type: 'closeTab'; windowId: number; tabId: number }
  | { type: 'toggleMute'; tabId: number }
  | { type: 'newTab'; windowId: number; spaceId?: string; url?: string }
  | { type: 'clearTemporary'; windowId: number; spaceId: string }
  /** Move a temporary tab to a position among a Space's temporary tabs (index omitted = end). */
  | { type: 'moveTab'; windowId: number; tabId: number; spaceId: string; index?: number }
  | { type: 'openPin'; windowId: number; pinId: string }
  | { type: 'unloadPin'; windowId: number; pinId: string }
  | { type: 'resetPin'; windowId: number; pinId: string }
  /** Make the pin's home its tab's current page. */
  | { type: 'setPinHome'; windowId: number; pinId: string }
  /** Save a temporary tab as a pin inside a Space folder (or subfolder). */
  | { type: 'pinTab'; windowId: number; tabId: number; parentId: string; index?: number }
  /** Remove a pin, keeping (or opening) its tab as a temporary tab. */
  | { type: 'unpin'; windowId: number; pinId: string; spaceId: string; index?: number }
  | { type: 'moveBookmark'; id: string; parentId: string; index?: number }
  | { type: 'renameBookmark'; id: string; title: string }
  | { type: 'deleteBookmark'; windowId: number; id: string }
  | { type: 'createFolder'; parentId: string; index?: number; title: string }
  | { type: 'openFavorite'; windowId: number; favoriteId: string }
  | { type: 'addFavorite'; windowId: number; tabId: number; index?: number }
  | { type: 'removeFavorite'; windowId: number; favoriteId: string }
  /** Reorder favorites; `index` is the final position. */
  | { type: 'moveFavorite'; favoriteId: string; index: number }
  | { type: 'switchSpace'; windowId: number; spaceId: string }
  | { type: 'createSpace'; windowId: number; name?: string; hue?: number }
  | { type: 'renameSpace'; spaceId: string; name: string }
  | { type: 'setSpaceHue'; spaceId: string; hue: number }
  | { type: 'moveSpace'; spaceId: string; index: number }
  | { type: 'deleteSpace'; windowId: number; spaceId: string }
  | { type: 'reopenArchived'; windowId: number; entryId: string }
  | { type: 'openUrl'; windowId: number; url: string }
  | { type: 'search'; windowId: number; text: string };

export interface CommandMessage {
  type: 'command';
  command: Command;
}

/** Sent by a side panel when it opens, so the worker can tidy that window. */
export interface HelloMessage {
  type: 'hello';
  windowId: number;
}

export type RuntimeMessage = CommandMessage | HelloMessage;

export type CommandResult = { ok: true; value?: unknown } | { ok: false; error: string };
