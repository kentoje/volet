/** One result in the command palette. */
export interface PaletteItem {
  /** Unique key, e.g. `tab:12`. */
  id: string;
  kind: 'tab' | 'pin' | 'favorite' | 'archived' | 'space' | 'action' | 'open-url' | 'search';
  title: string;
  /** Secondary text: the site, the Space, or what the action does. */
  detail?: string;
  /** Page URL, for the favicon. */
  url?: string;
  /** Space color, for Space results. */
  hue?: number;
  /** What the item points at: a tab id, bookmark id, archive entry id, Space id or action name. */
  ref?: string | number;
}

export interface PaletteResults {
  items: PaletteItem[];
  /** The active Space's hue, so the palette wears its tint. */
  hue: number;
}

export type PaletteAction = 'new-tab' | 'new-space' | 'clear-tabs' | 'settings' | 'import-arc';
