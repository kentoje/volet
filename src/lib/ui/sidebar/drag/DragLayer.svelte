<script lang="ts">
  import type { DragDropManager } from '@dnd-kit/dom';
  import { DOMRectangle } from '@dnd-kit/dom/utilities';
  import { DragDropProvider } from '@dnd-kit/svelte';
  import type { Snippet } from 'svelte';
  import { type Entry, entryKey, sameEntry } from '@/lib/model/dnd';
  import type { SidebarStore } from '@/lib/model/types';
  import { getSelection } from '../selection/selection.svelte';
  import { type DragData, sensors, setDrag, setSpaceOrder } from './context';
  import { type Hover, DragState } from './drag-state.svelte';
  import DragPreview from './DragPreview.svelte';
  import { firstInside, along, nearestSlot } from './drop-geometry';
  import { gather, land } from './group-motion';
  import { SpaceOrder } from './space-order.svelte';
  import { PAGE_SLIDE_MS } from '../../primitives/motion';

  let { store, children }: { store: SidebarStore; children: Snippet } = $props();

  // The store is created once at mount and never replaced.
  // svelte-ignore state_referenced_locally
  const drag = setDrag(new DragState(store, getSelection()));
  // svelte-ignore state_referenced_locally
  const spaceOrder = setSpaceOrder(new SpaceOrder(store));

  /** dnd-kit measures drop zones once; after things slid (a Space switch, rows closing gaps), measure again. */
  let manager: DragDropManager | undefined;
  const remeasureAfter = (ms: number) =>
    setTimeout(() => {
      for (const droppable of manager?.registry.droppables ?? []) droppable.refreshShape();
    }, ms + 40);
  drag.onSpaceSwitched = () => remeasureAfter(PAGE_SLIDE_MS);

  /** Keys of the rows a drag of `active` carries along, besides itself. */
  const carriedWith = (active: Entry, group: Entry[]) =>
    group.filter((entry) => !sameEntry(entry, active)).map(entryKey);

  type Point = { x: number; y: number };
  type Box = { left: number; top: number; width: number; height: number };
  type Node = { data?: unknown; shape?: { boundingRectangle: Box } | null } | null | undefined;
  type Operation = { source?: Node; target?: Node; position?: { current: Point } };
  const dataOf = (node: Node) => node?.data as DragData | undefined;

  /** What the pointer is over: a row and how far along it, a spot in a list, or a Space dot. */
  function hoverOf(operation: Operation): Hover | undefined {
    const data = dataOf(operation.target);
    const pointer = operation.position?.current;
    if (!data || !pointer) return undefined;
    if (data.kind === 'space') return data;
    if (data.kind === 'entry') {
      const at = along(operation.target?.shape?.boundingRectangle, pointer, data.axis);
      return { kind: 'row', entry: data.entry, at, inside: firstInside(data.entry) };
    }
    return { kind: 'slot', slot: nearestSlot(data.list, pointer, data.axis) ?? { kind: 'end', list: data.list } };
  }

  /**
   * dnd-kit reports a move before it updates the pointer's position and what is under it,
   * so read the live operation once per frame instead, after both have caught up.
   */
  let frame = 0;
  const placeNextFrame = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!manager) return;
      // dnd-kit only looks for what is under the pointer when the dragged shape changes, and
      // rows have no dnd-kit feedback to report theirs: the preview stands for them.
      const preview = document.querySelector('[data-drag-preview]');
      if (preview) manager.dragOperation.shape = new DOMRectangle(preview);
      place(manager.dragOperation as Operation);
    });
  };

  /** Where the pointer is while dragging an entry (the preview follows it). */
  let pointer = $state<Point>();

  const place = (operation: Operation) => {
    const at = operation.position?.current;
    if (drag.active && at) pointer = { x: at.x, y: at.y };
    // A dot being dragged only moves among the other dots.
    if (spaceOrder.active === undefined) return drag.over(hoverOf(operation));
    const data = dataOf(operation.target);
    if (data?.kind === 'space' && at) {
      spaceOrder.over(data.spaceId, along(operation.target?.shape?.boundingRectangle, at, 'x') > 0.5);
    }
  };
</script>

<!-- Translates dnd-kit's events into DragState calls. -->
<DragDropProvider
  {sensors}
  onDragStart={(event, dragManager) => {
    manager = dragManager;
    const source = dataOf((event.operation as Operation).source);
    if (source?.kind === 'entry') {
      const entry = source.entry;
      const at = (event.operation as Operation).position?.current;
      pointer = at && { x: at.x, y: at.y };
      void gather(carriedWith(entry, drag.groupFor(entry)), () => drag.start(entry));
    }
    if (source?.kind === 'space') spaceOrder.start(source.spaceId);
  }}
  onDragOver={placeNextFrame}
  onDragMove={placeNextFrame}
  onDragEnd={(event) => {
    cancelAnimationFrame(frame);
    if (spaceOrder.active !== undefined) {
      void spaceOrder.end(event.canceled);
      return;
    }
    const end = () => void drag.end(event.canceled);
    // Dropped on a Space dot, the rows leave this page: nothing lands here.
    const leaving = !event.canceled && drag.overSpace;
    if (drag.active && !leaving) drag.hold(land(entryKey(drag.active), carriedWith(drag.active, drag.group), end));
    else end();
  }}
>
  {@render children()}
  {#if drag.active && !drag.released && pointer}
    <DragPreview entry={drag.active} count={drag.group.length} {pointer} />
  {/if}
</DragDropProvider>
