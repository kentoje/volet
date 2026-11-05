import { browser } from 'wxt/browser';
import { moveBookmark } from './bookmarks';
import { pinTab } from './pins';
import type { Handlers } from './types';

export const folderHandlers = {
  async createFolder({ parentId, index, title }) {
    return (await browser.bookmarks.create({ parentId, index, title })).id;
  },

  /** Create a folder, then move pins and folders into it and pin tabs into it, in order. */
  async createFolderWith({ windowId, parentId, index, title, items }) {
    const folder = await browser.bookmarks.create({ parentId, index, title });
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
