import { browser } from 'wxt/browser';
import { openFoldersItem } from '../storage';
import { moveBookmark } from './bookmarks';
import { pinTab } from './pins';
import type { Handlers } from './types';

/**
 * A folder made in Volet starts open: you're about to name or fill it. (Any other folder starts
 * collapsed, see `openFoldersItem`.)
 */
async function createOpenFolder(parentId: string, index: number | undefined, title: string): Promise<string> {
  const folder = await browser.bookmarks.create({ parentId, index, title });
  await openFoldersItem.setValue([...(await openFoldersItem.getValue()), folder.id]);
  return folder.id;
}

export const folderHandlers = {
  async createFolder({ parentId, index, title }) {
    return createOpenFolder(parentId, index, title);
  },

  /** Create a folder, then move pins and folders into it and pin tabs into it, in order. */
  async createFolderWith({ windowId, parentId, index, title, items }) {
    const folder = { id: await createOpenFolder(parentId, index, title) };
    for (const [position, item] of items.entries()) {
      if (item.kind === 'tab') {
        await pinTab({ type: 'pinTab', windowId, tabId: item.id, parentId: folder.id, index: position });
      } else {
        await moveBookmark({ type: 'moveBookmark', id: item.id, parentId: folder.id, index: position });
      }
    }
    return folder.id;
  },
} satisfies Partial<Handlers>;
