import type { DndLookup } from '@/lib/model/dnd';
import type { SidebarStore } from '@/lib/model/types';
import { findNode, folderContains } from './tree';

/** Answers questions about the store's current content (for drag-and-drop rules). */
export function createLookup(store: SidebarStore): DndLookup {
  return {
    node: (id) => findNode(store.spaces, id),
    favorite: (id) => store.favorites.find((favorite) => favorite.id === id),
    contains: (ancestorId, folderId) => folderContains(store.spaces, ancestorId, folderId),
  };
}
