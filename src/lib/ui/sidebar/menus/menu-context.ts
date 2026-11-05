import { ArrowRightLeft } from '@lucide/svelte';
import { getSidebar } from '@/lib/model/context';
import type { MenuItem } from '@/lib/model/menu';
import type { SidebarStore, SpaceId } from '@/lib/model/types';
import type { ConfirmState } from '../editing/confirm-state.svelte';
import { getConfirm, getRename } from '../editing/context';
import type { RenameState } from '../editing/rename-state.svelte';

/** What menu builders can act on. */
export interface MenuContext {
  store: SidebarStore;
  rename: RenameState;
  confirm: ConfirmState;
}

/** Call during component setup (it reads contexts). */
export function getMenuContext(): MenuContext {
  return { store: getSidebar(), rename: getRename(), confirm: getConfirm() };
}

/** "Move to Space" submenu listing every other Space. */
export function moveToSpace(store: SidebarStore, current: SpaceId | undefined, move: (spaceId: SpaceId) => void): MenuItem {
  return {
    kind: 'submenu',
    label: 'Move to Space',
    icon: ArrowRightLeft,
    items: store.spaces
      .filter((space) => space.id !== current)
      .map((space) => ({ kind: 'action', label: space.name, onSelect: () => move(space.id) })),
  };
}
