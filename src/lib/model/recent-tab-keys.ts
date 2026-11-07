import { matchesPreviewCloseShortcut } from './preview-close-shortcut';

/** What a key does while the switcher is open, wherever it's pressed: on the page or in the Volet panel. */
export type RecentTabKey = 'cancel' | 'choose' | 'next' | 'previous' | 'close';

/** Keys the panel reports to the page, plus letting go of the modifier and losing focus mid-gesture. */
export type PanelKey = RecentTabKey | 'release' | 'leave';

const PANEL_KEYS: readonly PanelKey[] = ['cancel', 'choose', 'next', 'previous', 'close', 'release', 'leave'];

/** The close shortcut must match exactly; the others are plain keys pressed with the modifier still held. */
export function recentTabKey(event: Parameters<typeof matchesPreviewCloseShortcut>[0], closeShortcut: string): RecentTabKey | undefined {
  if (matchesPreviewCloseShortcut(event, closeShortcut)) return 'close';
  switch (event.key) {
    case 'Escape': return 'cancel';
    case 'Enter': return 'choose';
    case 'ArrowRight': return 'next';
    case 'ArrowLeft': return 'previous';
    default: return undefined;
  }
}

/** Validate a panel key at the extension message boundary. */
export function isPanelKey(value: unknown): value is PanelKey {
  return PANEL_KEYS.includes(value as PanelKey);
}
