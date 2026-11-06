import { browser } from 'wxt/browser';
import { countPins, type ImportedNode } from '../../import/types';
import { nextHue } from '../colors';
import { ensureRoot } from '../root';
import { spaceFolders } from '../snapshot';
import { uniqueName } from '../space-names';
import { spaceMetaItem } from '../storage';
import type { Handlers } from './types';

async function createNodes(parentId: string, nodes: ImportedNode[]): Promise<void> {
  for (const node of nodes) {
    if (node.kind === 'pin') {
      await browser.bookmarks.create({ parentId, title: node.title, url: node.url });
    } else {
      const folder = await browser.bookmarks.create({ parentId, title: node.title });
      await createNodes(folder.id, node.children);
    }
  }
}

export const importHandlers = {
  /** New Spaces are added next to the existing ones (names made unique); favorites skip duplicates. */
  async importSidebar({ sidebar }) {
    const ids = await ensureRoot();
    const root = (await browser.bookmarks.getSubTree(ids.rootId))[0]!;
    const taken = spaceFolders(root, ids.favoritesId).map((space) => space.title);
    const meta = { ...(await spaceMetaItem.getValue()) };
    const hues = Object.values(meta).map((m) => m.hue);

    for (const space of sidebar.spaces) {
      const title = uniqueName(space.name, taken);
      taken.push(title);
      const hue = space.hue ?? nextHue(hues);
      hues.push(hue);
      meta[title] = { hue };
      // Color first, so the Space appears in its color right away.
      await spaceMetaItem.setValue(meta);
      const folder = await browser.bookmarks.create({ parentId: ids.rootId, title });
      await createNodes(folder.id, space.pinned);
    }

    const known = new Set((root.children?.find((n) => n.id === ids.favoritesId)?.children ?? []).map((n) => n.url));
    let favorites = 0;
    for (const favorite of sidebar.favorites) {
      if (known.has(favorite.url)) continue;
      known.add(favorite.url);
      await browser.bookmarks.create({ parentId: ids.favoritesId, title: favorite.title, url: favorite.url });
      favorites++;
    }

    return {
      spaces: sidebar.spaces.length,
      pins: sidebar.spaces.reduce((total, space) => total + countPins(space.pinned), 0),
      favorites,
    };
  },
} satisfies Partial<Handlers>;
