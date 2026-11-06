import { browser } from 'wxt/browser';
import { countPins, type ImportResult, type ImportedLink, type ImportedNode, type ImportedSpace } from '../../import/types';
import { nextHue } from '../colors';
import { loadRoot } from '../root';
import { type BookmarkNode, favoritesFolder, spaceFolders } from '../snapshot';
import { uniqueName } from '../space-names';
import { arcInviteItem, importedArcSpacesItem, spaceMetaItem } from '../storage';
import { rememberAutoTitles } from '../titles';
import type { Handlers } from './types';

/**
 * What creating the pins and folders collects along the way. (The folders start collapsed, like
 * any folder Volet didn't make, so a big Arc sidebar arrives tidy.)
 */
interface Created {
  /** Bookmarks titled after their page (not a name the user chose in Arc): they follow it. */
  auto: { id: string; title: string }[];
}

async function createNodes(parentId: string, nodes: ImportedNode[], created: Created): Promise<void> {
  for (const node of nodes) {
    if (node.kind === 'pin') {
      const pin = await browser.bookmarks.create({ parentId, title: node.title, url: node.url });
      if (!node.named) created.auto.push(pin);
    } else {
      const folder = await browser.bookmarks.create({ parentId, title: node.title });
      await createNodes(folder.id, node.children, created);
    }
  }
}

/** Add each Space next to the existing ones (names made unique), with its color. Returns their ids. */
async function importSpaces(
  root: BookmarkNode,
  favoritesId: string,
  spaces: ImportedSpace[],
  created: Created,
): Promise<string[]> {
  const taken = spaceFolders(root, favoritesId).map((space) => space.title);
  const meta = { ...(await spaceMetaItem.getValue()) };
  const hues = Object.values(meta).map((m) => m.hue);
  const spaceIds: string[] = [];
  for (const space of spaces) {
    const title = uniqueName(space.name, taken);
    taken.push(title);
    const hue = space.hue ?? nextHue(hues);
    hues.push(hue);
    meta[title] = { hue };
    // Color first, so the Space appears in its color right away.
    await spaceMetaItem.setValue(meta);
    const folder = await browser.bookmarks.create({ parentId: root.id, title });
    spaceIds.push(folder.id);
    await createNodes(folder.id, space.pinned, created);
  }
  return spaceIds;
}

/** Add the favorites not there yet (same URL). Returns how many were added. */
async function importFavorites(
  root: BookmarkNode,
  favoritesId: string,
  favorites: ImportedLink[],
  created: Created,
): Promise<number> {
  const known = new Set((favoritesFolder(root, favoritesId)?.children ?? []).map((node) => node.url));
  let added = 0;
  for (const favorite of favorites) {
    if (known.has(favorite.url)) continue;
    known.add(favorite.url);
    const bookmark = await browser.bookmarks.create({ parentId: favoritesId, title: favorite.title, url: favorite.url });
    if (!favorite.named) created.auto.push(bookmark);
    added++;
  }
  return added;
}

export const importHandlers = {
  /**
   * New Spaces are added next to the existing ones (names made unique); favorites skip duplicates.
   * Resolves with what was imported, and the new Spaces' ids.
   */
  async importSidebar({ sidebar }): Promise<ImportResult> {
    const { ids, root } = await loadRoot();
    const created: Created = { auto: [] };
    const spaceIds = await importSpaces(root, ids.favoritesId, sidebar.spaces, created);
    const favorites = await importFavorites(root, ids.favoritesId, sidebar.favorites, created);

    await rememberAutoTitles(created.auto);
    // Remember which Spaces came in (the sidebar stops offering them), and the welcome card has done its job.
    const sourceIds = sidebar.spaces.flatMap((space) => (space.id ? [space.id] : []));
    if (sourceIds.length) {
      await importedArcSpacesItem.setValue([...new Set([...(await importedArcSpacesItem.getValue()), ...sourceIds])]);
    }
    await arcInviteItem.setValue(false);

    return {
      spaces: sidebar.spaces.length,
      pins: sidebar.spaces.reduce((total, space) => total + countPins(space.pinned), 0),
      favorites,
      spaceIds,
    };
  },
} satisfies Partial<Handlers>;
