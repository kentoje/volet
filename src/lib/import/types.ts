/** A sidebar to import, independent of where it came from. */
export interface ImportedSidebar {
  spaces: ImportedSpace[];
  favorites: ImportedLink[];
}

export interface ImportedSpace {
  name: string;
  /** OKLCH hue, if the source had a color. */
  hue?: number;
  pinned: ImportedNode[];
}

export interface ImportedLink {
  title: string;
  url: string;
}

export type ImportedNode = ({ kind: 'pin' } & ImportedLink) | { kind: 'folder'; title: string; children: ImportedNode[] };

export function countPins(nodes: ImportedNode[]): number {
  return nodes.reduce((total, node) => total + (node.kind === 'pin' ? 1 : countPins(node.children)), 0);
}
