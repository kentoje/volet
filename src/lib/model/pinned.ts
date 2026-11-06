import type { Pin, PinnedNode, TabId } from './types';

/** Every pin in `nodes`, at any depth, in page order. */
export function allPinsIn(nodes: PinnedNode[]): Pin[] {
  return nodes.flatMap((node) => (node.kind === 'pin' ? [node] : allPinsIn(node.children)));
}

/** The pins in `nodes`, at any depth, whose tab is open: a collapsed folder still shows them. */
export function openPinsIn(nodes: PinnedNode[]): Pin[] {
  return nodes.flatMap((node) =>
    node.kind === 'folder' ? openPinsIn(node.children) : node.tabId !== undefined ? [node] : [],
  );
}

/** Whether a row stays in a collapsed folder: a pin with an open tab, or a folder holding one. */
export function hasOpenTab(node: PinnedNode): boolean {
  return node.kind === 'pin' ? node.tabId !== undefined : node.children.some(hasOpenTab);
}

/** The pin, at any depth, whose tab is `activeTabId`. */
export function activePinsIn(nodes: PinnedNode[], activeTabId: TabId | undefined): Pin[] {
  if (activeTabId === undefined) return [];
  return openPinsIn(nodes).filter((pin) => pin.tabId === activeTabId);
}
