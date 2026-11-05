import { moveAround } from '@/lib/model/dnd';
import type { SidebarStore, Space, SpaceId } from '@/lib/model/types';

/**
 * Reordering Spaces by dragging their dots. While dragging, the dots render from a draft
 * order that follows the pointer; on drop it becomes one `moveSpace`, and the draft is kept
 * until the store shows the result, so nothing jumps back.
 */
export class SpaceOrder {
  /** Space ids in their mid-drag order; undefined when no dot is being dragged. */
  draft = $state.raw<SpaceId[] | undefined>();
  /** The Space whose dot is being dragged. */
  active = $state<SpaceId | undefined>();

  #store: SidebarStore;

  constructor(store: SidebarStore) {
    this.#store = store;
  }

  /** The Spaces in the order to show them. */
  ordered(spaces: Space[]): Space[] {
    const { draft } = this;
    if (!draft) return spaces;
    return draft.flatMap((id) => spaces.find((space) => space.id === id) ?? []);
  }

  isActive(spaceId: SpaceId): boolean {
    return this.active === spaceId;
  }

  start(spaceId: SpaceId): void {
    this.draft = this.#store.spaces.map((space) => space.id);
    this.active = spaceId;
  }

  /** The dragged dot is over another dot: before it, or after it when `after`. */
  over(targetId: SpaceId, after: boolean): void {
    const { draft, active } = this;
    if (!draft || !active) return;
    const next = moveAround(draft, active, targetId, after);
    if (next.some((id, index) => id !== draft[index])) this.draft = next;
  }

  async end(canceled: boolean): Promise<void> {
    const { draft, active } = this;
    const index = active && draft ? draft.indexOf(active) : -1;
    const from = this.#store.spaces.findIndex((space) => space.id === active);
    if (!canceled && active && index !== -1 && index !== from) await this.#store.moveSpace(active, index);
    this.draft = undefined;
    this.active = undefined;
  }
}
