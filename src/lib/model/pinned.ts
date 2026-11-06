import type { Pin, PinnedNode, TabId } from './types';

/** The pins in `nodes`, at any depth, whose tab is open: a collapsed folder still shows them. */
export function openPinsIn(nodes: PinnedNode[]): Pin[] {
  return nodes.flatMap((node) =>
    node.kind === 'folder' ? openPinsIn(node.children) : node.tabId !== undefined ? [node] : [],
  );
}

/** Whether a row stays in a collapsed folder: a pin with an open tab, or a folder holding one. */
export function hasOpenTab(node: PinnedNode): boolean {
  return node.kind === 'pin' ? node.tabId !== undefined : openPinsIn(node.children).length > 0;
}

/** The pin, at any depth, whose tab is `activeTabId`. */
export function activePinsIn(nodes: PinnedNode[], activeTabId: TabId | undefined): Pin[] {
  if (activeTabId === undefined) return [];
  return openPinsIn(nodes).filter((pin) => pin.tabId === activeTabId);
}
