import { rgbToHue } from './color';
import type { ImportedLink, ImportedNode, ImportedSidebar, ImportedSpace } from './types';

/*
 * Arc keeps its sidebar in ~/Library/Application Support/Arc/StorableSidebar.json.
 * The parts used here:
 *   sidebar.containers[n] = { spaces, items, topAppsContainerIDs }
 *   spaces / items: alternating [id, object, id, object, ...]
 *   space: { title, containerIDs: ['pinned', id, 'unpinned', id], customInfo.windowTheme... }
 *   item: { title (custom name or null), childrenIds, data: { tab: { savedURL, savedTitle } } | { list: {} } }
 *   topAppsContainerIDs: alternating [profile, containerId] (the favorites)
 */

interface ArcItem {
  id: string;
  title?: string | null;
  childrenIds?: string[];
  data?: { tab?: { savedURL?: string; savedTitle?: string }; list?: unknown; itemContainer?: unknown };
}

interface ArcSpace {
  id: string;
  title?: string;
  containerIDs?: unknown[];
  customInfo?: { windowTheme?: { primaryColorPalette?: { midTone?: { red?: number; green?: number; blue?: number } } } };
}

interface ArcContainer {
  spaces?: unknown[];
  items?: unknown[];
  topAppsContainerIDs?: unknown[];
}

export class ArcImportError extends Error {}

const objects = <T>(list: unknown[] | undefined): T[] =>
  (list ?? []).filter((entry): entry is T => typeof entry === 'object' && entry !== null);

/** Read Arc's sidebar file into Spaces (with their pinned tabs and folders) and favorites. Pure. */
export function parseArcSidebar(json: unknown): ImportedSidebar {
  const containers = (json as { sidebar?: { containers?: unknown[] } })?.sidebar?.containers;
  const container = objects<ArcContainer>(containers).find((c) => Array.isArray(c.spaces) && Array.isArray(c.items));
  if (!container) throw new ArcImportError("This doesn't look like Arc's StorableSidebar.json file.");

  const items = new Map(objects<ArcItem>(container.items).map((item) => [item.id, item]));
  const toNodes = (ids: string[] | undefined, seen: Set<string>): ImportedNode[] =>
    (ids ?? []).flatMap((id): ImportedNode[] => {
      const item = items.get(id);
      if (!item || seen.has(id)) return [];
      seen.add(id);
      const tab = item.data?.tab;
      if (tab?.savedURL) {
        // Arc's `title` is a name the user gave the tab; `savedTitle` is the page's own.
        const named = item.title ? ({ named: true } as const) : {};
        return [{ kind: 'pin', title: item.title || tab.savedTitle || tab.savedURL, url: tab.savedURL, ...named }];
      }
      if (item.data && 'list' in item.data) {
        return [{ kind: 'folder', title: item.title || 'Folder', children: toNodes(item.childrenIds, seen) }];
      }
      return [];
    });

  const spaces: ImportedSpace[] = objects<ArcSpace>(container.spaces).map((space) => {
    const ids = space.containerIDs ?? [];
    const pinnedId = ids[ids.indexOf('pinned') + 1];
    const pinnedContainer = typeof pinnedId === 'string' ? items.get(pinnedId) : undefined;
    const tone = space.customInfo?.windowTheme?.primaryColorPalette?.midTone;
    const hue = tone ? rgbToHue(tone.red ?? 0, tone.green ?? 0, tone.blue ?? 0) : undefined;
    return {
      id: space.id,
      name: space.title?.trim() || 'Volet',
      hue,
      pinned: toNodes(pinnedContainer?.childrenIds, new Set()),
    };
  });

  const topAppsId = (container.topAppsContainerIDs ?? []).find((entry): entry is string => typeof entry === 'string');
  const favorites: ImportedLink[] = toNodes(items.get(topAppsId ?? '')?.childrenIds, new Set()).flatMap((node) =>
    node.kind === 'pin' ? [{ title: node.title, url: node.url, ...(node.named && { named: node.named }) }] : [],
  );

  return { spaces, favorites };
}
