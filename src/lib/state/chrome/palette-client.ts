import type { PaletteClient, PaletteResults } from '@/lib/model/palette';
import { send } from './command-client';

/**
 * Palette backed by the service worker. Without `windowId` (in a web page),
 * the worker uses the window of the page's tab.
 */
export function chromePaletteClient(windowId?: number): PaletteClient {
  return {
    async search(text) {
      return (await send({ type: 'palette:query', windowId, text })) as PaletteResults;
    },
    async run(item) {
      await send({ type: 'palette:run', windowId, item });
    },
  };
}
