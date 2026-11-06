import {
  type DndLookup,
  type Drop,
  type DropAction,
  type Entry,
  type ListId,
  type Lists,
  type Slot,
  buildLists,
  dropOnSpace,
  groupDrop,
  resolveDrop,
  sameEntry,
  sameSlot,
  slotAt,
} from '@/lib/model/dnd';
import type { SidebarStore, SpaceId } from '@/lib/model/types';
import { createLookup } from '@/lib/state/lookup';
import type { Selection } from '../selection/selection.svelte';

/** How long a dragged entry must hover another Space's dot before switching to that Space. */
const SPACE_DWELL_MS = 450;

/** What the rows show: the sidebar's tabs, pins and favorites. */
export type SidebarContent = Pick<SidebarStore, 'spaces' | 'favorites' | 'tabs'>;

/** What the pointer is over during a drag. */
export type Hover =
  /**
   * A row (or tile): `at` is how far along it the pointer is, from 0 (top or left) to 1.
   * `inside` is the first row shown inside it (a folder's), if any.
   */
  | { kind: 'row'; entry: Entry; at: number; inside?: Entry }
  /** A list, between or around its rows: the slot was found from the rows nearby. */
  | { kind: 'slot'; slot: Slot }
  | { kind: 'space'; spaceId: SpaceId };

/**
 * Drag-and-drop state. While dragging, nothing moves: `drop` says where the rows would land
 * (shown as a line between rows, a lit-up folder or a lit-up empty list). On drop, `draft`
 * shows the lists as they will be right away, and stays until the store shows the result and
 * the dragged rows have flown into their places in it (`hold`).
 *
 * Dragging one of several selected rows drags them all: they stay in place, faded, while the
 * dragged row carries them (shown as a stack), and they land together, in page order.
 */
export class DragState {
  /** The lists right after a drop, until the store catches up; undefined otherwise. */
  draft = $state.raw<Lists | undefined>();
  active = $state.raw<Entry | undefined>();
  /** Everything the drag carries, in page order (just the active entry, or the selection). */
  group = $state.raw<Entry[]>([]);
  /** Where the group would land if dropped now. */
  drop = $state.raw<Drop | undefined>();
  /** Let go: the rows are landing (the drag is over, its state stays until they have). */
  released = $state(false);
  /**
   * The content as it was when let go, while the draft shows: the store may already have turned
   * a dropped entry into something else (a pin into a tab), and the draft still shows it as it was.
   */
  kept = $state.raw<SidebarContent | undefined>();

  /** Called after hovering a dot switched Space: the drop zones moved and need re-measuring. */
  onSpaceSwitched: (() => void) | undefined;

  #store: SidebarStore;
  #selection: Selection;
  #lookup: DndLookup;
  #hover: Hover | undefined;
  #dwell: { spaceId: string; timer: ReturnType<typeof setTimeout> } | undefined;
  #landing: Promise<unknown> | undefined;

  constructor(store: SidebarStore, selection: Selection) {
    this.#store = store;
    this.#selection = selection;
    this.#lookup = createLookup(store);
  }

  /** The store's lists, built once per change (the pointer moves far more often than they change). */
  #lists = $derived.by(() => buildLists(this.#store.spaces, this.#store.favorites));

  /** A list's entries: the draft's right after a drop, otherwise `current`. */
  entries(list: ListId, current: () => Entry[]): Entry[] {
    return this.draft?.[list] ?? current();
  }

  /** Look something up in the sidebar's content, or in the content as it was when let go (see `kept`). */
  find<T>(lookup: (content: SidebarContent) => T | undefined): T | undefined {
    return lookup(this.#store) ?? (this.kept && lookup(this.kept));
  }

  isActive(entry: Entry): boolean {
    return this.active !== undefined && sameEntry(this.active, entry);
  }

  /** Whether the drag carries `entry` (the dragged row, or one of the selection it drags along). */
  carries(entry: Entry): boolean {
    return this.group.some((other) => sameEntry(other, entry));
  }

  /** Carried rows stay in place, faded, until they are let go. */
  faded(entry: Entry): boolean {
    return !this.released && this.carries(entry);
  }

  /** The side of `entry` the drop line is on, when the drop goes right next to it. */
  lineAt(entry: Entry): 'before' | 'after' | undefined {
    const slot = this.drop?.slot;
    return slot?.kind === 'beside' && sameEntry(slot.entry, entry) ? slot.side : undefined;
  }

  /** Whether the drop goes into this folder. */
  isInto(folderId: string): boolean {
    const slot = this.drop?.slot;
    return slot?.kind === 'into' && slot.folderId === folderId;
  }

  /** Whether the drop goes into this (empty) list. */
  fills(list: ListId): boolean {
    const slot = this.drop?.slot;
    return slot?.kind === 'end' && slot.list === list;
  }

  /** Whether the pointer is over a Space dot: dropped there, the rows leave this page. */
  get overSpace(): boolean {
    return this.#hover?.kind === 'space';
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
    this.active = entry;
  }

  over(hover: Hover | undefined): void {
    if (!this.active) return;
    this.#hover = hover;
    this.#hoverSpace(hover?.kind === 'space' ? hover.spaceId : undefined);
    const slot = this.#slotFor(hover);
    const drop = slot && resolveDrop(this.#lists, this.group, slot, this.#lookup);
    if (!sameSlot(drop?.slot, this.drop?.slot)) this.drop = drop;
  }

  #slotFor(hover: Hover | undefined): Slot | undefined {
    if (hover?.kind === 'slot') return hover.slot;
    if (hover?.kind !== 'row') return undefined;
    const folder = hover.entry.kind === 'node' && this.#lookup.node(hover.entry.id)?.kind === 'folder';
    return slotAt(hover.entry, hover.at, folder, hover.inside);
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

  /** Make the drop real. The draft is set before the first await, so callers can measure the result. */
  async end(canceled: boolean): Promise<void> {
    this.#hoverSpace(undefined);
    this.released = true;
    const { spaces, favorites, tabs } = this.#store;
    this.kept = { spaces, favorites, tabs };
    const actions = canceled ? [] : this.#actions();
    this.drop = undefined;
    if (actions.length && this.group.length > 1) this.#selection.clear();
    for (const action of actions) await this.#perform(action);
    // Rows still flying into place keep the draft's identity (a tab doesn't turn into a pin mid-flight).
    await this.#landing;
    this.#landing = undefined;
    this.#hover = undefined;
    this.draft = undefined;
    this.kept = undefined;
    this.active = undefined;
    this.group = [];
    this.released = false;
  }

  /** Keep showing the draft after a drop until `landing` settles (rows animating into place). */
  hold(landing: Promise<unknown>): void {
    this.#landing = landing;
  }

  #actions(): DropAction[] {
    const hover = this.#hover;
    if (hover?.kind === 'space') return this.group.flatMap((entry) => dropOnSpace(entry, hover.spaceId, this.#lookup) ?? []);
    if (!this.drop) return [];
    const { actions, lists: landed } = groupDrop(this.#lists, this.group, this.drop.list, this.drop.after, this.#lookup);
    // Show the rows where they land right away; the store catches up behind the draft.
    this.draft = landed;
    return actions;
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
