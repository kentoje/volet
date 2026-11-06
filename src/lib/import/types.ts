/** A sidebar to import, independent of where it came from. */
export interface ImportedSidebar {
  spaces: ImportedSpace[];
  favorites: ImportedLink[];
}

export interface ImportedSpace {
  /** The source's own id for the Space, to tell later which ones were imported. */
  id?: string;
  name: string;
  /** OKLCH hue, if the source had a color. */
  hue?: number;
  pinned: ImportedNode[];
}

export interface ImportedLink {
  title: string;
  url: string;
  /** The title is a name the user gave it (not the page's): it's kept as is. */
  named?: true;
}

export type ImportedNode = ({ kind: 'pin' } & ImportedLink) | { kind: 'folder'; title: string; children: ImportedNode[] };

export function countPins(nodes: ImportedNode[]): number {
  return nodes.reduce((total, node) => total + (node.kind === 'pin' ? 1 : countPins(node.children)), 0);
}
