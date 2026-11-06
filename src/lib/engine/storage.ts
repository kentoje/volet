import { storage } from 'wxt/utils/storage';
import { type ArchiveEntry, type Binding, DEFAULT_SETTINGS, type RootIds, type Settings, type SpaceMeta } from './schema';

export * from './schema';

// Session: tab and group ids change on every browser restart, so these are rebuilt then.
/** tabId → binding */
export const bindingsItem = storage.defineItem<Record<string, Binding>>('session:bindings', { fallback: {} });
/** groupId → spaceId */
export const groupSpacesItem = storage.defineItem<Record<string, string>>('session:groupSpaces', { fallback: {} });
/** windowId → spaceId */
export const activeSpacesItem = storage.defineItem<Record<string, string>>('session:activeSpaces', { fallback: {} });
/** windowId → spaceId → tabId last active in that Space */
export const lastActiveItem = storage.defineItem<Record<string, Record<string, number>>>('session:lastActive', {
  fallback: {},
});
/** tabId → last time it was active (ms) */
export const tabActivityItem = storage.defineItem<Record<string, number>>('session:tabActivity', { fallback: {} });
/** windowId → true when the palette should open in that window's side panel */
export const pendingPaletteItem = storage.defineItem<Record<string, boolean>>('session:pendingPalette', {
  fallback: {},
});
/** windowId → true while that window shows the side panel */
export const openPanelsItem = storage.defineItem<Record<string, true>>('session:openPanels', { fallback: {} });

// Local: device-specific (bookmark ids differ between devices).
export const rootItem = storage.defineItem<RootIds | null>('local:root', { fallback: null });
export const collapsedItem = storage.defineItem<string[]>('local:collapsedFolders', { fallback: [] });
export const archiveItem = storage.defineItem<ArchiveEntry[]>('local:archive', { fallback: [] });

// Sync: follows the user across devices. Keyed by Space name since bookmark ids differ per device.
export const spaceMetaItem = storage.defineItem<Record<string, SpaceMeta>>('sync:spaceMeta', { fallback: {} });
export const settingsItem = storage.defineItem<Settings>('sync:settings', { fallback: DEFAULT_SETTINGS });
