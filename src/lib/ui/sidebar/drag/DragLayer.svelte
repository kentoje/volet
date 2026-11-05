<script lang="ts">
  import { DragDropProvider } from '@dnd-kit/svelte';
  import type { Snippet } from 'svelte';
  import type { SidebarStore } from '@/lib/model/types';
  import { type DragData, sensors, setDrag } from './context';
  import { type DropTarget, DragState } from './drag-state.svelte';

  let { store, children }: { store: SidebarStore; children: Snippet } = $props();

  // The store is created once at mount and never replaced.
  // svelte-ignore state_referenced_locally
  const drag = setDrag(new DragState(store));

  type Point = { x: number; y: number };
  type Node = { data?: unknown; shape?: { center: Point } | null } | null | undefined;
  type Operation = { source?: Node; target?: Node; position?: { current: Point } };
  const dataOf = (node: Node) => node?.data as DragData | undefined;

  /** What the pointer is over; for entries, which side of their middle it is on. */
  function targetOf(operation: Operation): DropTarget | undefined {
    const data = dataOf(operation.target);
    if (data?.kind !== 'entry') return data;
    const center = operation.target?.shape?.center;
    const pointer = operation.position?.current;
    const after = Boolean(center && pointer && (data.axis === 'x' ? pointer.x > center.x : pointer.y > center.y));
    return { kind: 'entry', entry: data.entry, after };
  }

  const place = (operation: Operation) => {
    const target = targetOf(operation);
    if (target) drag.over(target);
  };
</script>

<!-- Translates dnd-kit's events into DragState calls. -->
<DragDropProvider
  {sensors}
  onDragStart={(event) => {
    const source = dataOf((event.operation as Operation).source);
    if (source?.kind === 'entry') drag.start(source.entry);
  }}
  onDragOver={(event) => place(event.operation as Operation)}
  onDragMove={(event) => place(event.operation as Operation)}
  onDragEnd={(event) => {
    void drag.end({ canceled: event.canceled, target: targetOf(event.operation as Operation) });
  }}
>
  {@render children()}
</DragDropProvider>
