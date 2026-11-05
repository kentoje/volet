<script lang="ts">
  import type { DragDropManager } from '@dnd-kit/dom';
  import { DragDropProvider } from '@dnd-kit/svelte';
  import type { Snippet } from 'svelte';
  import { type Entry, entryKey, sameEntry } from '@/lib/model/dnd';
  import type { SidebarStore } from '@/lib/model/types';
  import { getSelection } from '../selection/selection.svelte';
  import { type DragData, sensors, setDrag, setSpaceOrder } from './context';
  import { type DropTarget, DragState } from './drag-state.svelte';
  import { GATHER_MS, gather, land } from './group-motion';
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
  type Node = { data?: unknown; shape?: { center: Point } | null } | null | undefined;
  type Operation = { source?: Node; target?: Node; position?: { current: Point } };
  const dataOf = (node: Node) => node?.data as DragData | undefined;

  /** Whether the pointer is past the middle of what it is over, along `axis`. */
  function pastMiddle(operation: Operation, axis: 'x' | 'y'): boolean {
    const center = operation.target?.shape?.center;
    const pointer = operation.position?.current;
    return Boolean(center && pointer && (axis === 'x' ? pointer.x > center.x : pointer.y > center.y));
  }

  /** What the pointer is over; for entries, which side of their middle it is on. */
  function targetOf(operation: Operation): DropTarget | undefined {
    const data = dataOf(operation.target);
    if (data?.kind !== 'entry') return data;
    return { kind: 'entry', entry: data.entry, after: pastMiddle(operation, data.axis) };
  }

  const place = (operation: Operation) => {
    const target = targetOf(operation);
    // A dot being dragged only moves among the other dots.
    if (spaceOrder.active !== undefined) {
      if (target?.kind === 'space') spaceOrder.over(target.spaceId, pastMiddle(operation, 'x'));
    } else if (target) {
      drag.over(target);
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
      const carried = carriedWith(entry, drag.groupFor(entry));
      void gather(carried, () => drag.start(entry));
      if (carried.length) remeasureAfter(GATHER_MS);
    }
    if (source?.kind === 'space') spaceOrder.start(source.spaceId);
  }}
  onDragOver={(event) => place(event.operation as Operation)}
  onDragMove={(event) => place(event.operation as Operation)}
  onDragEnd={(event) => {
    if (spaceOrder.active !== undefined) {
      void spaceOrder.end(event.canceled);
      return;
    }
    const target = targetOf(event.operation as Operation);
    const end = () => void drag.end({ canceled: event.canceled, target });
    // Dropped on a Space dot, the rows leave this page: nothing lands here.
    const leaving = !event.canceled && target?.kind === 'space';
    if (drag.active && !leaving) drag.hold(land(carriedWith(drag.active, drag.group), end));
    else end();
  }}
>
  {@render children()}
</DragDropProvider>
