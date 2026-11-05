import type { Pin, PinnedNode, TabId } from './types';

/** Arc behavior: a collapsed folder still shows the pin whose tab you're on. */
export function activePinsIn(nodes: PinnedNode[], activeTabId: TabId | undefined): Pin[] {
  if (activeTabId === undefined) return [];
  return nodes.flatMap((node) =>
    node.kind === 'folder' ? activePinsIn(node.children, activeTabId) : node.tabId === activeTabId ? [node] : [],
  );
}
