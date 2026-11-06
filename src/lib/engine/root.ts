import { browser } from 'wxt/browser';
import { type BookmarkNode, isSpaceFolder } from './snapshot';
import { DEFAULT_SPACE_NAME, FAVORITES_TITLE, ROOT_TITLE, type RootIds, rootItem } from './storage';

/**
 * Find or create the root "Volet" folder and its Favorites folder (and a first Space when making
 * them; `loadRoot` keeps one there after that).
 */
export async function ensureRoot(): Promise<RootIds> {
  const saved = await rootItem.getValue();
  const current = saved && (await savedRoot(saved));
  if (saved && current) {
    // The folder used to be called "Spaces": give it the extension's name.
    if (current.title !== ROOT_TITLE) await browser.bookmarks.update(current.id, { title: ROOT_TITLE });
    return saved;
  }

  const parent = await storageFolder();
  const children = await browser.bookmarks.getChildren(parent.id);
  const root =
    children.find((node) => node.url === undefined && node.title === ROOT_TITLE) ??
    (await browser.bookmarks.create({ parentId: parent.id, title: ROOT_TITLE }));

  const rootChildren = await browser.bookmarks.getChildren(root.id);
  const favorites =
    rootChildren.find((node) => node.url === undefined && node.title === FAVORITES_TITLE) ??
    (await browser.bookmarks.create({ parentId: root.id, title: FAVORITES_TITLE, index: 0 }));
  if (!rootChildren.some((node) => isSpaceFolder(node, favorites.id))) {
    await browser.bookmarks.create({ parentId: root.id, title: DEFAULT_SPACE_NAME });
  }

  const ids = { rootId: root.id, favoritesId: favorites.id };
  await rootItem.setValue(ids);
  return ids;
}

/**
 * The root folder and its whole tree (made first if needed, see `ensureRoot`), with at least one
 * Space in it: someone may have removed them all in Chrome's bookmarks, or sync may have.
 */
export async function loadRoot(): Promise<{ ids: RootIds; root: BookmarkNode }> {
  const ids = await ensureRoot();
  const root = await subtree(ids.rootId);
  if (root.children?.some((node) => isSpaceFolder(node, ids.favoritesId))) return { ids, root };
  await addFirstSpace(ids);
  return { ids, root: await subtree(ids.rootId) };
}

async function subtree(rootId: string): Promise<BookmarkNode> {
  const [root] = await browser.bookmarks.getSubTree(rootId);
  if (!root) throw new Error('The Volet bookmark folder is gone');
  return root;
}

/** The Space being made after they were all removed, while it's on its way (one, however many tasks ask). */
let adding: Promise<unknown> | undefined;

/** Make the first Space again, as a first run does, unless it's there by now. */
function addFirstSpace(ids: RootIds): Promise<unknown> {
  adding ??= (async () => {
    const children = await browser.bookmarks.getChildren(ids.rootId);
    if (children.some((node) => isSpaceFolder(node, ids.favoritesId))) return;
    await browser.bookmarks.create({ parentId: ids.rootId, title: DEFAULT_SPACE_NAME });
  })().finally(() => (adding = undefined));
  return adding;
}

/** The saved root folder, if it's still there with its Favorites folder inside. */
async function savedRoot(ids: RootIds) {
  try {
    // Both in one call (this runs before every command): it fails if either is gone.
    const [root, favorites] = await browser.bookmarks.get([ids.rootId, ids.favoritesId]);
    return root && favorites?.parentId === root.id ? root : undefined;
  } catch {
    return undefined; // deleted
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
