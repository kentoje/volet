import { FolderPlus, X } from '@lucide/svelte';
import { type MenuItem, separator, tidy } from '@/lib/model/menu';
import type { SidebarStore, SpaceId, SpaceItem } from '@/lib/model/types';
import { findNode } from '@/lib/state/tree';
import { createWithAndRename, type MenuContext, moveToSpace } from './menu-context';

/** A row's menu: the selection's menu when the row is one of several selected rows. */
export function rowMenu(entry: SpaceItem, menus: MenuContext, own: () => MenuItem[]): MenuItem[] {
  return menus.selection.inGroup(entry) ? selectionMenu(menus) : own();
}

/** Right-click menu of several selected rows. */
export function selectionMenu(menus: MenuContext): MenuItem[] {
  const { store, selection } = menus;
  const items = selection.group();
  const space = store.spaces.find((s) => s.id === store.activeSpaceId);
  const first = items[0];
  const folders = items.filter((item) => item.kind === 'node' && findNode(store.spaces, item.id)?.kind === 'folder');
  const noun = folders.length ? 'items' : 'tabs';
  const openTabs = items.filter((item) => tabToClose(store, item));
  // Every action leaves the rows elsewhere (or gone), so the selection ends with it.
  const thenClear = (action: () => Promise<void>) => () => {
    selection.clear();
    void action();
  };
  return tidy([
    space &&
      first && {
        kind: 'action',
        label: `New folder with ${items.length} ${noun}`,
        icon: FolderPlus,
        onSelect: thenClear(() => createWithAndRename(menus, space, items)),
      },
    moveToSpace(store, space?.id, (spaceId) => thenClear(() => moveAll(store, items, spaceId))()),
    separator,
    openTabs.length > 0 && {
      kind: 'action',
      label: openTabs.length === 1 ? 'Close tab' : `Close ${openTabs.length} tabs`,
      icon: X,
      onSelect: thenClear(async () => {
        for (const item of openTabs) await closeItem(store, item);
      }),
    },
  ]);
}

/** Whether closing `item` closes a tab: a temporary tab, or a pin with its tab open. */
function tabToClose(store: SidebarStore, item: SpaceItem): boolean {
  if (item.kind === 'tab') return true;
  const node = findNode(store.spaces, item.id);
  return node?.kind === 'pin' && node.tabId !== undefined;
}

async function closeItem(store: SidebarStore, item: SpaceItem): Promise<void> {
  if (item.kind === 'tab') await store.closeTab(item.id);
  else await store.unloadPin(item.id);
}

/** Move rows to the end of another Space, in order. */
async function moveAll(store: SidebarStore, items: SpaceItem[], spaceId: SpaceId): Promise<void> {
  for (const item of items) {
    if (item.kind === 'tab') await store.moveTab(item.id, spaceId);
    else await store.moveNode(item.id, spaceId);
  }
}
