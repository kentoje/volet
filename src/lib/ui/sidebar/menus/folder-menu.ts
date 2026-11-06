import { FolderPlus, PencilLine, Trash } from '@lucide/svelte';
import { type MenuItem, separator, tidy } from '@/lib/model/menu';
import type { Folder, PinnedNode } from '@/lib/model/types';
import { spaceOfNode } from '@/lib/state/tree';
import { type MenuContext, moveToSpace, newFolder } from './menu-context';

const countPins = (nodes: PinnedNode[]): number =>
  nodes.reduce((total, node) => total + (node.kind === 'pin' ? 1 : countPins(node.children)), 0);

/** Right-click menu of a pinned folder. */
export function folderMenu(folder: Folder, { store, rename, confirm }: MenuContext): MenuItem[] {
  const space = spaceOfNode(store.spaces, folder.id);
  const pins = countPins(folder.children);
  return tidy([
    { kind: 'action', label: 'Rename', icon: PencilLine, onSelect: () => rename.start(folder.id) },
    newFolder(store, space?.id),
    {
      kind: 'action',
      label: 'New folder inside',
      icon: FolderPlus,
      onSelect: async () => {
        if (store.collapsedFolders.has(folder.id)) await store.toggleFolder(folder.id);
        await store.createFolder(folder.id);
      },
    },
    moveToSpace(store, space?.id, (spaceId) => store.moveNode(folder.id, spaceId)),
    separator,
    {
      kind: 'action',
      label: 'Delete folder',
      icon: Trash,
      destructive: true,
      onSelect: async () => {
        if (
          pins === 0 ||
          (await confirm.ask({
            title: `Delete “${folder.title}”?`,
            description: `Its ${pins === 1 ? 'pin' : `${pins} pins`} will be deleted. Open tabs stay open.`,
            confirmLabel: 'Delete folder',
          }))
        ) {
          await store.deleteNode(folder.id);
        }
      },
    },
  ]);
}
