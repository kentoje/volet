import { ArrowRightLeft, FolderPlus } from '@lucide/svelte';
import { getSidebar } from '@/lib/model/context';
import type { MenuItem } from '@/lib/model/menu';
import { folderPlace } from '@/lib/model/selection';
import type { SidebarStore, Space, SpaceId, SpaceItem } from '@/lib/model/types';
import type { ConfirmState } from '../editing/confirm-state.svelte';
import { getConfirm, getRename } from '../editing/context';
import type { RenameState } from '../editing/rename-state.svelte';
import { getHuePreview, type HuePreview } from '../hue-preview.svelte';
import { getSelection, type Selection } from '../selection/selection.svelte';

/** What menu builders can act on. */
export interface MenuContext {
  store: SidebarStore;
  rename: RenameState;
  confirm: ConfirmState;
  selection: Selection;
  huePreview: HuePreview;
}

/** Call during component setup (it reads contexts). */
export function getMenuContext(): MenuContext {
  return {
    store: getSidebar(),
    rename: getRename(),
    confirm: getConfirm(),
    selection: getSelection(),
    huePreview: getHuePreview(),
  };
}

/** Create a folder at the top of `parentId` (a Space or a folder), then rename it right away. */
export async function createAndRename({ store, rename }: MenuContext, parentId: string): Promise<void> {
  const id = await store.createFolder(parentId);
  if (id) rename.start(id);
}

/** "New folder" at the top of a Space's pins (never inside another folder). */
export function newFolder(menus: MenuContext, spaceId: SpaceId | undefined): MenuItem | false {
  if (spaceId === undefined) return false;
  return { kind: 'action', label: 'New folder', icon: FolderPlus, onSelect: () => createAndRename(menus, spaceId) };
}

/**
 * Put `items` in a new folder where the first of them is (tabs are pinned in, so a folder of tabs goes after
 * the pins), then rename it right away.
 */
export async function createWithAndRename({ store, rename }: MenuContext, space: Space, items: SpaceItem[]): Promise<void> {
  const first = items[0];
  if (!first) return;
  const place = folderPlace(space, first);
  const id = await store.createFolderWith(items, place.parentId, place.index);
  if (id) rename.start(id);
}

/** "New folder" holding the row it was opened on. */
export function newFolderWith(menus: MenuContext, space: Space | undefined, item: SpaceItem): MenuItem | false {
  if (!space) return false;
  return {
    kind: 'action',
    label: 'New folder',
    icon: FolderPlus,
    onSelect: () => void createWithAndRename(menus, space, [item]),
  };
}

/** "Move to Volet" submenu listing every other Space, each with its color. */
export function moveToSpace(store: SidebarStore, current: SpaceId | undefined, move: (spaceId: SpaceId) => void): MenuItem {
  return {
    kind: 'submenu',
    label: 'Move to Volet',
    icon: ArrowRightLeft,
    items: store.spaces
      .filter((space) => space.id !== current)
      .map((space) => ({ kind: 'action', label: space.name, hue: space.hue, onSelect: () => move(space.id) })),
  };
}
