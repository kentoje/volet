import { CornerUpLeft, House, PencilLine, PinOff, Star, X } from '@lucide/svelte';
import { type MenuItem, separator, tidy } from '@/lib/model/menu';
import type { Pin } from '@/lib/model/types';
import { spaceOfNode } from '@/lib/state/tree';
import { type MenuContext, moveToSpace } from './menu-context';

/** Right-click menu of a pin. `away`: its tab has left the pin's home page. */
export function pinMenu(pin: Pin, away: boolean, { store, rename }: MenuContext): MenuItem[] {
  const space = spaceOfNode(store.spaces, pin.id);
  const tabId = pin.tabId;
  return tidy([
    { kind: 'action', label: 'Rename', icon: PencilLine, onSelect: () => rename.start(pin.id) },
    away && { kind: 'action', label: 'Back to pinned page', icon: CornerUpLeft, onSelect: () => store.resetPin(pin.id) },
    away && { kind: 'action', label: 'Pin this page instead', icon: House, onSelect: () => store.setPinHome(pin.id) },
    tabId !== undefined && {
      kind: 'action',
      label: 'Add to favorites',
      icon: Star,
      onSelect: () => store.addFavorite(tabId),
    },
    moveToSpace(store, space?.id, (spaceId) => store.moveNode(pin.id, spaceId)),
    separator,
    space && {
      kind: 'action',
      label: 'Unpin',
      icon: PinOff,
      // Unpinning never loses the page: it becomes a temporary tab (opened if it was closed).
      onSelect: () => store.unpin(pin.id, space.id),
    },
    tabId !== undefined && { kind: 'action', label: 'Close tab', icon: X, onSelect: () => store.unloadPin(pin.id) },
  ]);
}
