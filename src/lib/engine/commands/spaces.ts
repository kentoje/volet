import { browser } from 'wxt/browser';
import { groupColorFor, nextHue } from '../colors';
import {
  type Context,
  activeSpaceOf,
  findSpace,
  hueOf,
  loadContext,
  spaceOfTab,
  spaceTabs,
  temporaryTabs,
} from '../context';
import { collapseOtherSpaces, updateSpaceGroups } from '../groups';
import { retry } from '../retry';
import { ensureRoot } from '../root';
import { isSpaceFolder } from '../snapshot';
import { lastActiveTab, park, rememberActive, setActiveSpace, unpark } from '../session';
import { newSpaceName, uniqueName } from '../space-names';
import { spaceMetaItem } from '../storage';
import { activate, openTabIn } from '../tab-ops';
import { moveBookmark } from './bookmarks';
import type { Handlers } from './types';

/**
 * Show a Space in a window: activate its last used tab and collapse the other Spaces. A Space with
 * no open tab (only pins, say) gets none: the page in front stays there (`park`) until another tab
 * is picked, unless `open` asks for a new tab (a new Space, or when the page in front is closing).
 */
export async function switchSpace(ctx: Context, spaceId: string, { open = false } = {}): Promise<void> {
  if (!findSpace(ctx, spaceId)) return;
  const previous = activeSpaceOf(ctx);
  const activeTab = ctx.tabs.find((tab) => tab.active);
  if (activeTab?.id !== undefined && previous !== spaceId && spaceOfTab(ctx, activeTab) === previous) {
    await rememberActive(ctx.windowId, previous, activeTab.id);
  }
  // Record the switch first: side panels follow storage, so they update right away.
  await setActiveSpace(ctx, spaceId);

  const tabs = spaceTabs(ctx, spaceId);
  const remembered = await lastActiveTab(ctx.windowId, spaceId);
  const target = tabs.find((tab) => tab.id === remembered) ?? temporaryTabs(ctx, spaceId).at(-1) ?? tabs.at(-1);
  if (target?.id !== undefined) {
    await unpark(ctx.windowId);
    await activate(target.id);
  } else if (open || activeTab?.id === undefined) {
    await openTabIn(ctx, spaceId);
  } else {
    await park(ctx.windowId, activeTab.id);
  }
  await collapseOtherSpaces(ctx, spaceId);
}

export const spaceHandlers = {
  async switchSpace({ windowId, spaceId }) {
    await switchSpace(await loadContext(windowId), spaceId);
  },

  async shiftSpace({ windowId, offset }) {
    const ctx = await loadContext(windowId);
    const index = ctx.spaces.findIndex((space) => space.id === activeSpaceOf(ctx));
    const target = ctx.spaces[(index + offset + ctx.spaces.length) % ctx.spaces.length];
    if (target) await switchSpace(ctx, target.id);
  },

  async createSpace({ windowId, name, hue }) {
    const ctx = await loadContext(windowId);
    const title = newSpaceName(
      name,
      ctx.spaces.map((space) => space.title),
    );
    const color = hue ?? nextHue(ctx.spaces.map((space) => hueOf(ctx, space.id)));
    await spaceMetaItem.setValue({ ...ctx.spaceMeta, [title]: { hue: color } });
    const folder = await browser.bookmarks.create({ parentId: ctx.ids.rootId, title });
    // A new Volet starts with a new tab.
    await switchSpace(await loadContext(windowId), folder.id, { open: true });
    return folder.id;
  },

  async renameSpace({ spaceId, name }) {
    const ctx = await loadContext((await browser.windows.getLastFocused()).id!);
    const space = findSpace(ctx, spaceId);
    const wanted = name.trim();
    if (!space || !wanted || wanted === space.title) return;
    const title = uniqueName(
      wanted,
      ctx.spaces.filter((s) => s.id !== spaceId).map((s) => s.title),
    );
    // Colors are keyed by name: carry this Space's over to its new name.
    const { [space.title]: meta, ...rest } = ctx.spaceMeta;
    await spaceMetaItem.setValue({ ...rest, [title]: meta ?? { hue: hueOf(ctx, spaceId) } });
    await browser.bookmarks.update(spaceId, { title });
    await updateSpaceGroups(spaceId, { title });
  },

  async setSpaceHue({ spaceId, hue }) {
    const [space] = await browser.bookmarks.get(spaceId);
    if (!space) return;
    const meta = await spaceMetaItem.getValue();
    await spaceMetaItem.setValue({ ...meta, [space.title]: { hue } });
    await updateSpaceGroups(spaceId, { color: groupColorFor(hue) });
  },

  /** Reorder Spaces; `index` counts Spaces only (the Favorites folder is skipped). */
  async moveSpace({ spaceId, index }) {
    const ids = await ensureRoot();
    const children = await browser.bookmarks.getChildren(ids.rootId);
    const spaces = children.filter((node) => isSpaceFolder(node, ids.favoritesId));
    const target = spaces[index];
    if (!target || target.id === spaceId) return;
    await moveBookmark({ type: 'moveBookmark', id: spaceId, parentId: ids.rootId, index: target.index });
  },

  /** Delete a Space with its pins, closing its tabs. Windows showing it switch to a neighbor first. */
  async deleteSpace({ windowId, spaceId }) {
    const ctx = await loadContext(windowId);
    const index = ctx.spaces.findIndex((space) => space.id === spaceId);
    const others = ctx.spaces.filter((space) => space.id !== spaceId);
    if (index === -1) return;
    if (others.length === 0) throw new Error('Keep at least one Volet');
    const fallback = (others[index] ?? others[index - 1] ?? others[0])!;

    for (const window of await browser.windows.getAll({ windowTypes: ['normal'] })) {
      const wctx = await loadContext(window.id!);
      // The tabs in front are about to close: the fallback needs one of its own.
      if (activeSpaceOf(wctx) === spaceId) await switchSpace(wctx, fallback.id, { open: true });
      const doomed = spaceTabs(await loadContext(window.id!), spaceId).map((tab) => tab.id!);
      if (doomed.length) await retry(() => browser.tabs.remove(doomed));
    }

    const { [ctx.spaces[index]!.title]: _removed, ...rest } = await spaceMetaItem.getValue();
    await spaceMetaItem.setValue(rest);
    await browser.bookmarks.removeTree(spaceId);
  },
} satisfies Partial<Handlers>;
