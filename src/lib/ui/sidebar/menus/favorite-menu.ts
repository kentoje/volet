import { StarOff, X } from '@lucide/svelte';
import { type MenuItem, tidy } from '@/lib/model/menu';
import type { Favorite } from '@/lib/model/types';
import type { MenuContext } from './menu-context';

/** Right-click menu of a favorite. */
export function favoriteMenu(favorite: Favorite, { store }: MenuContext): MenuItem[] {
  const tabId = favorite.tabId;
  return tidy([
    tabId !== undefined && { kind: 'action', label: 'Close tab', icon: X, onSelect: () => store.closeTab(tabId) },
    {
      kind: 'action',
      label: 'Remove from favorites',
      icon: StarOff,
      onSelect: () => store.removeFavorite(favorite.id),
    },
  ]);
}
