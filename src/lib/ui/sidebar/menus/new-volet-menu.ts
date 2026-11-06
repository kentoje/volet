import { EyeOff, Plus } from '@lucide/svelte';
import type { ArcClient } from '@/lib/model/arc';
import { type MenuItem, separator, tidy } from '@/lib/model/menu';
import type { SidebarStore } from '@/lib/model/types';

/** Bring an Arc Space in as a Volet, then show it. */
async function importAndShow(store: SidebarStore, arc: ArcClient, arcSpaceId: string): Promise<void> {
  const spaceId = await arc.importSpace(arcSpaceId);
  if (spaceId) await store.switchSpace(spaceId);
}

/**
 * The New Volet button's menu, while Arc Spaces are left to import: a blank Volet, or one of
 * those Spaces (one click each). With nothing to offer, the button just makes a Volet.
 */
export function newVoletMenu(store: SidebarStore, arc: ArcClient): MenuItem[] {
  return tidy([
    { kind: 'action', label: 'New Volet', icon: Plus, onSelect: () => void store.createSpace() },
    separator,
    {
      kind: 'group',
      label: 'From Arc',
      items: arc.offers.map((offer) => ({
        kind: 'action',
        label: offer.name,
        hue: offer.hue,
        onSelect: () => void importAndShow(store, arc, offer.id),
      })),
    },
    separator,
    { kind: 'action', label: 'Stop suggesting Arc Spaces', icon: EyeOff, onSelect: () => arc.forget() },
  ]);
}
