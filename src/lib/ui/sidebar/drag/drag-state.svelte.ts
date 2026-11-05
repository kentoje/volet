import {
  type DndLookup,
  type DropAction,
  type Entry,
  type ListId,
  type Lists,
  buildLists,
  canEnter,
  dropAction,
  dropOnSpace,
  locate,
  moveEntry,
  placeAround,
  sameEntry,
} from '@/lib/model/dnd';
import type { SidebarStore, SpaceId } from '@/lib/model/types';
import { createLookup } from '@/lib/state/lookup';

/** What the pointer is over during a drag. */
export type DropTarget =
  /** `after`: the pointer is past the entry's middle, so the dragged one goes after it. */
  | { kind: 'entry'; entry: Entry; after: boolean }
  | { kind: 'list'; list: ListId }
  | { kind: 'space'; spaceId: SpaceId };

/**
 * Drag-and-drop state. While dragging, lists render from a draft that is
 * reordered live; on drop the draft becomes one store action, and the draft is
 * kept until the store shows the result, so nothing jumps back.
 */
export class DragState {
  /** The lists as they look mid-drag; undefined when not dragging. */
  draft = $state.raw<Lists | undefined>();
  active = $state.raw<Entry | undefined>();

  #store: SidebarStore;
  #lookup: DndLookup;
  #origin: { list: ListId; index: number } | undefined;

  constructor(store: SidebarStore) {
    this.#store = store;
    this.#lookup = createLookup(store);
  }

  /** A list's entries: the draft's while dragging, otherwise `current`. */
  entries(list: ListId, current: () => Entry[]): Entry[] {
    return this.draft?.[list] ?? current();
  }

  isActive(entry: Entry): boolean {
    return this.active !== undefined && sameEntry(this.active, entry);
  }

  start(entry: Entry): void {
    this.draft = buildLists(this.#store.spaces, this.#store.favorites);
    this.active = entry;
    this.#origin = locate(this.draft, entry);
  }

  over(target: DropTarget): void {
    const { draft, active } = this;
    if (!draft || !active) return;
    const place = this.#placeFor(draft, active, target);
    if (!place || !canEnter(active, place.list, this.#lookup)) return;
    const current = locate(draft, active);
    if (current?.list === place.list && current.index === place.index) return;
    this.draft = moveEntry(draft, active, place.list, place.index);
  }

  async end(options: { canceled: boolean; target?: DropTarget }): Promise<void> {
    const action = options.canceled ? undefined : this.#actionFor(options.target);
    if (action) await this.#perform(action);
    this.draft = undefined;
    this.active = undefined;
    this.#origin = undefined;
  }

  #placeFor(draft: Lists, active: Entry, target: DropTarget): { list: ListId; index: number } | undefined {
    if (target.kind === 'entry') return placeAround(draft, active, target.entry, target.after);
    if (target.kind === 'list') {
      // Over a list's empty area: go to its end.
      const others = (draft[target.list] ?? []).filter((entry) => !sameEntry(entry, active));
      return { list: target.list, index: others.length };
    }
    return undefined;
  }

  #actionFor(target: DropTarget | undefined): DropAction | undefined {
    const { draft, active } = this;
    if (!draft || !active) return undefined;
    if (target?.kind === 'space') return dropOnSpace(active, target.spaceId, this.#lookup);
    const at = locate(draft, active);
    if (!at || (at.list === this.#origin?.list && at.index === this.#origin.index)) return undefined;
    return dropAction(active, at.list, at.index, this.#lookup);
  }

  #perform(action: DropAction) {
    const store = this.#store;
    switch (action.type) {
      case 'moveTab':
        return store.moveTab(action.tabId, action.spaceId, action.index);
      case 'pinTab':
        return store.pinTab(action.tabId, action.parentId, action.index);
      case 'unpin':
        return store.unpin(action.pinId, action.spaceId, action.index);
      case 'moveNode':
        return store.moveNode(action.id, action.parentId, action.index);
      case 'addFavorite':
        return store.addFavorite(action.tabId, action.index);
      case 'favoritePin':
        return store.favoritePin(action.pinId, action.index);
      case 'moveFavorite':
        return store.moveFavorite(action.favoriteId, action.index);
    }
  }
}
