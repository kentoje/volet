import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS, archiveItem, settingsItem } from '@/lib/engine/storage';

export interface Shortcut {
  name: string;
  description: string;
  /** Empty when the user hasn't assigned one. */
  keys: string;
}

/** Shortcuts listed in this order (Chrome returns them in no particular one). */
const SHORTCUT_ORDER = ['_execute_action', 'open-palette', 'next-space', 'previous-space', 'toggle-pin'];

/** The settings page's data: preferences, shortcuts, the archive. Preferences are written directly. */
export class SettingsStore {
  archiveAfterHours = $state(DEFAULT_SETTINGS.archiveAfterHours);
  shortcuts = $state.raw<Shortcut[]>([]);
  archivedCount = $state(0);

  async load(): Promise<void> {
    const [settings, commands, archive] = await Promise.all([
      settingsItem.getValue(),
      browser.commands.getAll(),
      archiveItem.getValue(),
    ]);
    this.archiveAfterHours = settings.archiveAfterHours;
    this.archivedCount = archive.length;
    this.shortcuts = commands
      .map((command) => ({
        name: command.name ?? '',
        description: command.description || 'Open the sidebar',
        keys: command.shortcut ?? '',
      }))
      .sort((a, b) => SHORTCUT_ORDER.indexOf(a.name) - SHORTCUT_ORDER.indexOf(b.name));
    settingsItem.watch((next) => (this.archiveAfterHours = next.archiveAfterHours));
    archiveItem.watch((next) => (this.archivedCount = next.length));
  }

  /** The keys that open search, if assigned. */
  get searchKeys(): string {
    return this.shortcuts.find((shortcut) => shortcut.name === 'open-palette')?.keys ?? '';
  }

  async setArchiveAfter(hours: number): Promise<void> {
    this.archiveAfterHours = hours;
    await settingsItem.setValue({ ...(await settingsItem.getValue()), archiveAfterHours: hours });
  }

  async clearArchive(): Promise<void> {
    this.archivedCount = 0;
    await archiveItem.setValue([]);
  }

  /** Chrome's own page for assigning extension shortcuts. */
  async editShortcuts(): Promise<void> {
    await browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
  }

  async openImport(): Promise<void> {
    await browser.tabs.create({ url: browser.runtime.getURL('/import.html') });
  }
}
