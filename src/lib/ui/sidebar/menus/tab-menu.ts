import { Pin, Star, Volume2, VolumeX, X } from '@lucide/svelte';
import { type MenuItem, separator, tidy } from '@/lib/model/menu';
import type { LiveTab } from '@/lib/model/types';
import { spaceOfTab } from '@/lib/state/tree';
import { type MenuContext, moveToSpace } from './menu-context';

/** Right-click menu of a temporary tab. */
export function tabMenu(tab: LiveTab, { store }: MenuContext): MenuItem[] {
  const space = spaceOfTab(store.spaces, tab.id);
  return tidy([
    space && { kind: 'action', label: 'Pin tab', icon: Pin, onSelect: () => store.pinTab(tab.id, space.id) },
    { kind: 'action', label: 'Add to favorites', icon: Star, onSelect: () => store.addFavorite(tab.id) },
    moveToSpace(store, space?.id, (spaceId) => store.moveTab(tab.id, spaceId)),
    tab.audible && {
      kind: 'action',
      label: tab.muted ? 'Unmute tab' : 'Mute tab',
      icon: tab.muted ? Volume2 : VolumeX,
      onSelect: () => store.toggleMute(tab.id),
    },
    separator,
    { kind: 'action', label: 'Close tab', icon: X, onSelect: () => store.closeTab(tab.id) },
  ]);
}
