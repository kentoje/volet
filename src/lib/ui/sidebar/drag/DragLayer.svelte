<script lang="ts">
  import { DragDropProvider } from '@dnd-kit/svelte';
  import type { Snippet } from 'svelte';
  import type { SidebarStore } from '@/lib/model/types';
  import { type DragData, sensors, setDrag } from './context';
  import { DragState } from './drag-state.svelte';

  let { store, children }: { store: SidebarStore; children: Snippet } = $props();

  // The store is created once at mount and never replaced.
  // svelte-ignore state_referenced_locally
  const drag = setDrag(new DragState(store));

  type Node = { data?: unknown } | null | undefined;
  type Operation = { source?: Node; target?: Node };
  const dataOf = (node: Node) => node?.data as DragData | undefined;
</script>

<!-- Translates dnd-kit's events into DragState calls. -->
<DragDropProvider
  {sensors}
  onDragStart={(event) => {
    const source = dataOf((event.operation as Operation).source);
    if (source?.kind === 'entry') drag.start(source.entry);
  }}
  onDragOver={(event) => {
    const target = dataOf((event.operation as Operation).target);
    if (target) drag.over(target);
  }}
  onDragEnd={(event) => {
    const target = dataOf((event.operation as Operation).target);
    void drag.end({ canceled: event.canceled, target });
  }}
>
  {@render children()}
</DragDropProvider>
