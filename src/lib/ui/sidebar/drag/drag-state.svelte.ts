import {
  type DndLookup,
  type DropAction,
  type Entry,
  type ListId,
  type Lists,
  buildLists,
  canEnter,
  dropOnSpace,
  groupDrop,
  locate,
  moveEntry,
  placeAround,
  sameEntry,
  withoutEntry,
} from '@/lib/model/dnd';
import type { SidebarStore, SpaceId } from '@/lib/model/types';
import { createLookup } from '@/lib/state/lookup';
import type { Selection } from '../selection/selection.svelte';

/** How long a dragged entry must hover another Space's dot before switching to that Space. */
const SPACE_DWELL_MS = 450;

/** What the pointer is over during a drag. */
export type DropTarget =
  /** `after`: the pointer is past the entry's middle, so the dragged one goes after it. */
  | { kind: 'entry'; entry: Entry; after: boolean }
  | { kind: 'list'; list: ListId }
  | { kind: 'space'; spaceId: SpaceId };

/**
 * Drag-and-drop state. While dragging, lists render from a draft that is
 * reordered live; on drop the draft becomes store actions, and the draft is
 * kept until the store shows the result, so nothing jumps back.
 *
 * Dragging one of several selected rows drags them all: the others leave the
 * lists while the dragged row carries them (shown as a stack), and they land
 * together, in page order, where it is dropped.
 */
export class DragState {
  /** The lists as they look mid-drag; undefined when not dragging. */
  draft = $state.raw<Lists | undefined>();
  active = $state.raw<Entry | undefined>();
  /** Everything the drag carries, in page order (just the active entry, or the selection). */
  group = $state.raw<Entry[]>([]);

  /** Called after hovering a dot switched Space: the drop zones moved and need re-measuring. */
  onSpaceSwitched: (() => void) | undefined;

  #store: SidebarStore;
  #selection: Selection;
  #lookup: DndLookup;
  #dwell: { spaceId: string; timer: ReturnType<typeof setTimeout> } | undefined;
  #landing: Promise<unknown> | undefined;

  constructor(store: SidebarStore, selection: Selection) {
    this.#store = store;
    this.#selection = selection;
    this.#lookup = createLookup(store);
  }

  /** A list's entries: the draft's while dragging, otherwise `current`. */
  entries(list: ListId, current: () => Entry[]): Entry[] {
    return this.draft?.[list] ?? current();
  }

  isActive(entry: Entry): boolean {
    return this.active !== undefined && sameEntry(this.active, entry);
  }

  /** What dragging `entry` carries: the selection when it is one of several selected rows. */
  groupFor(entry: Entry): Entry[] {
    const selected = this.#selection.inGroup(entry) ? this.#selection.group() : [];
    // Inside a selected folder, the row would move with the folder: drag it on its own then.
    return selected.some((other) => sameEntry(other, entry)) ? selected : [entry];
  }

  start(entry: Entry): void {
    this.group = this.groupFor(entry);
    if (!this.#selection.has(entry)) this.#selection.clear();
    const lists = buildLists(this.#store.spaces, this.#store.favorites);
    this.draft = this.group.reduce((draft, other) => (sameEntry(other, entry) ? draft : withoutEntry(draft, other)), lists);
    this.active = entry;
  }

  over(target: DropTarget): void {
    const { draft, active } = this;
    if (!draft || !active) return;
    this.#hoverSpace(target.kind === 'space' ? target.spaceId : undefined);
    const place = this.#placeFor(draft, active, target);
    if (!place || !this.group.every((entry) => canEnter(entry, place.list, this.#lookup))) return;
    const current = locate(draft, active);
    if (current?.list === place.list && current.index === place.index) return;
    this.draft = moveEntry(draft, active, place.list, place.index);
  }

  /**
   * Hovering another Space's dot for a moment switches to that Space, so the entry can
   * then be dropped at an exact spot there (dropping right on the dot still works too).
   */
  #hoverSpace(spaceId: string | undefined): void {
    if (this.#dwell?.spaceId === spaceId) return;
    clearTimeout(this.#dwell?.timer);
    this.#dwell = undefined;
    if (spaceId === undefined || spaceId === this.#store.activeSpaceId) return;
    const timer = setTimeout(() => {
      void this.#store.switchSpace(spaceId);
      this.onSpaceSwitched?.();
    }, SPACE_DWELL_MS);
    this.#dwell = { spaceId, timer };
  }

  async end(options: { canceled: boolean; target?: DropTarget }): Promise<void> {
    this.#hoverSpace(undefined);
    const actions = options.canceled ? [] : this.#actionsFor(options.target);
    if (actions.length && this.group.length > 1) this.#selection.clear();
    for (const action of actions) await this.#perform(action);
    // Rows still flying into place keep the draft's identity (a tab doesn't turn into a pin mid-flight).
    await this.#landing;
    this.#landing = undefined;
    this.draft = undefined;
    this.active = undefined;
    this.group = [];
  }

  /** Keep showing the draft after a drop until `landing` settles (rows animating into place). */
  hold(landing: Promise<unknown>): void {
    this.#landing = landing;
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

  #actionsFor(target: DropTarget | undefined): DropAction[] {
    const { draft, active, group } = this;
    if (!draft || !active) return [];
    if (target?.kind === 'space') return group.flatMap((entry) => dropOnSpace(entry, target.spaceId, this.#lookup) ?? []);
    const at = locate(draft, active);
    if (!at) return [];
    const list = draft[at.list]!;
    // Show the group where it lands right away; the store catches up behind the draft.
    this.draft = { ...draft, [at.list]: [...list.slice(0, at.index), ...group, ...list.slice(at.index + 1)] };
    const lists = buildLists(this.#store.spaces, this.#store.favorites);
    return groupDrop(lists, group, at.list, list[at.index - 1], this.#lookup);
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
