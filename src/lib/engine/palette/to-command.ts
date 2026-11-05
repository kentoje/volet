import type { Command } from '../protocol';
import type { PaletteAction, PaletteItem } from './types';

/** The engine command that carries out a chosen palette result. Pure. */
export function toCommand(item: PaletteItem, windowId: number, activeSpaceId: string): Command | undefined {
  const ref = item.ref;
  switch (item.kind) {
    case 'tab':
      return typeof ref === 'number' ? { type: 'focusTab', tabId: ref } : undefined;
    case 'pin':
      return { type: 'openPin', windowId, pinId: String(ref) };
    case 'favorite':
      return { type: 'openFavorite', windowId, favoriteId: String(ref) };
    case 'archived':
      return { type: 'reopenArchived', windowId, entryId: String(ref) };
    case 'space':
      return { type: 'switchSpace', windowId, spaceId: String(ref) };
    case 'open-url':
      return { type: 'openUrl', windowId, url: String(ref) };
    case 'search':
      return { type: 'search', windowId, text: String(ref) };
    case 'action':
      return actionCommand(ref as PaletteAction, windowId, activeSpaceId);
  }
}

function actionCommand(action: PaletteAction, windowId: number, activeSpaceId: string): Command {
  switch (action) {
    case 'new-tab':
      return { type: 'newTab', windowId, spaceId: activeSpaceId };
    case 'new-space':
      return { type: 'createSpace', windowId };
    case 'clear-tabs':
      return { type: 'clearTemporary', windowId, spaceId: activeSpaceId };
  }
}
