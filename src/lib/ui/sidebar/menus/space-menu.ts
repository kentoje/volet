import { ArrowLeft, ArrowRight, PencilLine, Trash } from '@lucide/svelte';
import { HUE_SWATCHES } from '@/lib/engine/colors';
import { type MenuItem, separator, tidy } from '@/lib/model/menu';
import type { Space } from '@/lib/model/types';
import { spaceKey } from '../editing/rename-state.svelte';
import { type MenuContext, newFolder } from './menu-context';

/** Right-click menu of a Space (its title or its dot in the switcher). */
export function spaceMenu(space: Space, menus: MenuContext): MenuItem[] {
  const { store, rename, confirm } = menus;
  const index = store.spaces.findIndex((s) => s.id === space.id);
  const last = store.spaces.length - 1;
  return tidy([
    { kind: 'action', label: 'Rename Volet', icon: PencilLine, onSelect: () => rename.start(spaceKey(space.id)) },
    {
      kind: 'swatches',
      label: 'Color',
      hues: HUE_SWATCHES,
      selected: space.hue,
      onSelect: (hue) => store.setSpaceHue(space.id, hue),
    },
    newFolder(menus, space.id),
    separator,
    index > 0 && { kind: 'action', label: 'Move left', icon: ArrowLeft, onSelect: () => store.moveSpace(space.id, index - 1) },
    index < last && {
      kind: 'action',
      label: 'Move right',
      icon: ArrowRight,
      onSelect: () => store.moveSpace(space.id, index + 1),
    },
    separator,
    {
      kind: 'action',
      label: 'Delete Volet',
      icon: Trash,
      destructive: true,
      disabled: store.spaces.length < 2,
      onSelect: async () => {
        const confirmed = await confirm.ask({
          title: `Delete “${space.name}”?`,
          description: 'Its pins and folders will be deleted, and its open tabs closed.',
          confirmLabel: 'Delete Volet',
        });
        if (confirmed) await store.deleteSpace(space.id);
      },
    },
  ]);
}
