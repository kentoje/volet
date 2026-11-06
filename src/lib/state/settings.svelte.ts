import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS, archiveItem, settingsItem } from '@/lib/engine/storage';

interface Shortcut {
  name: string;
  description: string;
  /** Empty when the user hasn't assigned one. */
  keys: string;
}

/**
 * The shortcuts the manifest declares, listed in this order (Chrome returns them in no particular one). Chrome also
 * lists `_execute_action` (clicking the toolbar icon), which the sidebar shortcut already covers.
 */
const SHORTCUT_ORDER = ['toggle-sidebar', 'open-palette', 'next-space', 'previous-space', 'toggle-pin'];

/** The settings page's data: preferences, shortcuts, the archive. Preferences are written directly. */
export class SettingsStore {
  archiveAfterHours = $state(DEFAULT_SETTINGS.archiveAfterHours);
  shortcuts = $state.raw<Shortcut[]>([]);
  archivedCount = $state(0);
  /** The keys that open search, if assigned. */
  readonly searchKeys = $derived(this.shortcuts.find((shortcut) => shortcut.name === 'open-palette')?.keys ?? '');

  async load(): Promise<void> {
    const [settings, commands, archive] = await Promise.all([
      settingsItem.getValue(),
      browser.commands.getAll(),
      archiveItem.getValue(),
    ]);
    this.archiveAfterHours = settings.archiveAfterHours;
    this.archivedCount = archive.length;
    this.shortcuts = commands
      .filter((command) => SHORTCUT_ORDER.includes(command.name ?? ''))
      .map((command) => ({
        name: command.name ?? '',
        description: command.description ?? '',
        keys: command.shortcut ?? '',
      }))
      .sort((a, b) => SHORTCUT_ORDER.indexOf(a.name) - SHORTCUT_ORDER.indexOf(b.name));
    settingsItem.watch((next) => (this.archiveAfterHours = next.archiveAfterHours));
    archiveItem.watch((next) => (this.archivedCount = next.length));
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
