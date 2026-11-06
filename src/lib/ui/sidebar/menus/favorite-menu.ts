import { House, StarOff, X } from '@lucide/svelte';
import { type MenuItem, tidy } from '@/lib/model/menu';
import type { Favorite } from '@/lib/model/types';
import { sameUrl } from '@/lib/model/url';
import type { MenuContext } from './menu-context';

/** Right-click menu of a favorite. */
export function favoriteMenu(favorite: Favorite, { store }: MenuContext): MenuItem[] {
  const tabId = favorite.tabId;
  const tab = tabId !== undefined ? store.tabs.get(tabId) : undefined;
  // Its tab has left the favorite's page (once that page has loaded, not mid-redirect).
  const away = tab !== undefined && tab.status === 'complete' && !sameUrl(tab.url, favorite.url);
  return tidy([
    away && {
      kind: 'action',
      label: 'Favorite this page instead',
      icon: House,
      onSelect: () => store.setFavoriteHome(favorite.id),
    },
    tabId !== undefined && { kind: 'action', label: 'Close tab', icon: X, onSelect: () => store.closeTab(tabId) },
    {
      kind: 'action',
      label: 'Remove from favorites',
      icon: StarOff,
      onSelect: () => store.removeFavorite(favorite.id),
    },
  ]);
}
