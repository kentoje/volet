import { pendingPaletteItem } from '@/lib/engine/storage';

/**
 * Open the panel's palette when the shortcut was pressed on a page that can't
 * host it (the worker leaves a flag for this window), now or later.
 */
export function watchPaletteRequests(windowId: number) {
  return (open: () => void): void => {
    const check = async (pending: Record<string, boolean> | null) => {
      if (!pending?.[windowId]) return;
      const { [windowId]: _done, ...rest } = pending;
      await pendingPaletteItem.setValue(rest);
      open();
    };
    void pendingPaletteItem.getValue().then(check);
    pendingPaletteItem.watch((pending) => void check(pending));
  };
}
