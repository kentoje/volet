import { browser } from 'wxt/browser';
import { countPins, type ImportedLink, type ImportedNode } from '../../import/types';
import { nextHue } from '../colors';
import { ensureRoot } from '../root';
import { spaceFolders } from '../snapshot';
import { uniqueName } from '../space-names';
import { arcInviteItem, importedArcSpacesItem, spaceMetaItem } from '../storage';
import { markNamed } from '../titles';
import type { Handlers } from './types';

/** Create the pins and folders; collect the pins whose title the user chose (to keep it). */
async function createNodes(parentId: string, nodes: ImportedNode[], named: ImportedLink[]): Promise<void> {
  for (const node of nodes) {
    if (node.kind === 'pin') {
      await browser.bookmarks.create({ parentId, title: node.title, url: node.url });
      if (node.named) named.push(node);
    } else {
      const folder = await browser.bookmarks.create({ parentId, title: node.title });
      await createNodes(folder.id, node.children, named);
    }
  }
}

export const importHandlers = {
  /**
   * New Spaces are added next to the existing ones (names made unique); favorites skip duplicates.
   * Resolves with what was imported, and the new Spaces' ids.
   */
  async importSidebar({ sidebar }) {
    const ids = await ensureRoot();
    const root = (await browser.bookmarks.getSubTree(ids.rootId))[0]!;
    const taken = spaceFolders(root, ids.favoritesId).map((space) => space.title);
    const meta = { ...(await spaceMetaItem.getValue()) };
    const hues = Object.values(meta).map((m) => m.hue);

    const named: ImportedLink[] = [];
    const spaceIds: string[] = [];
    for (const space of sidebar.spaces) {
      const title = uniqueName(space.name, taken);
      taken.push(title);
      const hue = space.hue ?? nextHue(hues);
      hues.push(hue);
      meta[title] = { hue };
      // Color first, so the Space appears in its color right away.
      await spaceMetaItem.setValue(meta);
      const folder = await browser.bookmarks.create({ parentId: ids.rootId, title });
      spaceIds.push(folder.id);
      await createNodes(folder.id, space.pinned, named);
    }

    const known = new Set((root.children?.find((n) => n.id === ids.favoritesId)?.children ?? []).map((n) => n.url));
    let favorites = 0;
    for (const favorite of sidebar.favorites) {
      if (known.has(favorite.url)) continue;
      known.add(favorite.url);
      await browser.bookmarks.create({ parentId: ids.favoritesId, title: favorite.title, url: favorite.url });
      if (favorite.named) named.push(favorite);
      favorites++;
    }

    await markNamed(named);
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
