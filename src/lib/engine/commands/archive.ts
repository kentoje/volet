import { activeSpaceOf, loadContext } from '../context';
import { archiveItem } from '../storage';
import { openTabIn } from '../tab-ops';
import type { Handlers } from './types';

export const archiveHandlers = {
  /** Reopen an archived tab in the window's active Space. */
  async reopenArchived({ windowId, entryId }) {
    const archive = await archiveItem.getValue();
    const entry = archive.find((e) => e.id === entryId);
    if (!entry) return;
    await archiveItem.setValue(archive.filter((e) => e.id !== entryId));
    const ctx = await loadContext(windowId);
    return (await openTabIn(ctx, activeSpaceOf(ctx), entry.url)).id;
  },
} satisfies Partial<Handlers>;
