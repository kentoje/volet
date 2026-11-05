import type { Pin, PinnedNode, Space, SpaceId, TabId } from '@/lib/model/types';

/** Pure helpers over the sidebar's Space tree, used for optimistic updates. */

export function findPin(spaces: Space[], pinId: string): Pin | undefined {
  const search = (nodes: PinnedNode[]): Pin | undefined => {
    for (const node of nodes) {
      if (node.kind === 'pin' && node.id === pinId) return node;
      if (node.kind === 'folder') {
        const found = search(node.children);
        if (found) return found;
      }
    }
    return undefined;
  };
  for (const space of spaces) {
    const found = search(space.pinned);
    if (found) return found;
  }
  return undefined;
}

export function mapPins(nodes: PinnedNode[], change: (pin: Pin) => Pin): PinnedNode[] {
  return nodes.map((node) =>
    node.kind === 'pin' ? change(node) : { ...node, children: mapPins(node.children, change) },
  );
}

export function withoutTab(spaces: Space[], tabId: TabId): Space[] {
  return spaces.map((space) =>
    space.tabIds.includes(tabId) ? { ...space, tabIds: space.tabIds.filter((id) => id !== tabId) } : space,
  );
}

export function withPinTab(spaces: Space[], pinId: string, tabId: TabId | undefined): Space[] {
  return spaces.map((space) => ({
    ...space,
    pinned: mapPins(space.pinned, (pin) => (pin.id === pinId ? { ...pin, tabId } : pin)),
  }));
}

export function withTemporaryCleared(spaces: Space[], spaceId: SpaceId): Space[] {
  return spaces.map((space) => (space.id === spaceId ? { ...space, tabIds: [] } : space));
}

/** A copy of `set` with `value` added or removed. */
export function toggled<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
