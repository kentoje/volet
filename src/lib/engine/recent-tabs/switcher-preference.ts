import { storage } from 'wxt/utils/storage';

/** Device-local switcher preference, independent of assigned shortcuts and Chrome's site access. */
export const recentTabsOnItem = storage.defineItem<boolean>('local:recentTabsOn', { fallback: true });
