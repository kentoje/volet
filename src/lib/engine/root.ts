import { browser } from 'wxt/browser';
import { DEFAULT_SPACE_NAME, FAVORITES_TITLE, ROOT_TITLE, type RootIds, rootItem } from './storage';

/** Find or create the root "Spaces" folder, its Favorites folder, and at least one Space. */
export async function ensureRoot(): Promise<RootIds> {
  const saved = await rootItem.getValue();
  if (saved && (await isValid(saved))) return saved;

  const parent = await storageFolder();
  const children = await browser.bookmarks.getChildren(parent.id);
  const root =
    children.find((node) => node.url === undefined && node.title === ROOT_TITLE) ??
    (await browser.bookmarks.create({ parentId: parent.id, title: ROOT_TITLE }));

  const rootChildren = await browser.bookmarks.getChildren(root.id);
  const favorites =
    rootChildren.find((node) => node.url === undefined && node.title === FAVORITES_TITLE) ??
    (await browser.bookmarks.create({ parentId: root.id, title: FAVORITES_TITLE, index: 0 }));
  if (!rootChildren.some((node) => node.url === undefined && node.id !== favorites.id)) {
    await browser.bookmarks.create({ parentId: root.id, title: DEFAULT_SPACE_NAME });
  }

  const ids = { rootId: root.id, favoritesId: favorites.id };
  await rootItem.setValue(ids);
  return ids;
}

async function isValid(ids: RootIds): Promise<boolean> {
  try {
    const [root] = await browser.bookmarks.get(ids.rootId);
    const [favorites] = await browser.bookmarks.get(ids.favoritesId);
    return Boolean(root && favorites?.parentId === root.id);
  } catch {
    return false; // deleted
  }
}

/** "Other bookmarks", preferring the account (synced) copy when Chrome has both. */
async function storageFolder() {
  const [tree] = await browser.bookmarks.getTree();
  const top = tree?.children ?? [];
  const others = top.filter((node) => node.folderType === 'other');
  const folder = others.find((node) => node.syncing) ?? others[0] ?? top[1] ?? top[0];
  if (!folder) throw new Error('No bookmark folder to store Volets in');
  return folder;
}
