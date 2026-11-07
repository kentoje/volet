import { browser } from 'wxt/browser';
import { pinShortcutItem } from '@/lib/engine/storage';
import { isPageShortcut, PAGE_SHORTCUT_ORIGINS, type PageShortcut } from '@/lib/model/page-shortcut';

/** Device-local pin shortcut settings and the website access needed to run it. */
export class PinShortcutSettingsStore {
  shortcut = $state.raw<PageShortcut | null>(null);
  draft = $state.raw<PageShortcut | null>(null);
  hasAccess = $state(false);
  loaded = $state(false);
  saving = $state(false);
  message = $state('');

  start(): () => void {
    const update = (value: unknown) => {
      this.shortcut = this.draft = isPageShortcut(value) ? value : null;
      this.loaded = true;
    };
    const access = () => {
      void browser.permissions.contains({ origins: PAGE_SHORTCUT_ORIGINS }).then((granted) => (this.hasAccess = granted));
    };
    const unwatch = pinShortcutItem.watch(update);
    void pinShortcutItem.getValue().then(update);
    access();
    browser.permissions.onAdded.addListener(access);
    browser.permissions.onRemoved.addListener(access);
    return () => {
      unwatch();
      browser.permissions.onAdded.removeListener(access);
      browser.permissions.onRemoved.removeListener(access);
    };
  }

  async save(): Promise<void> {
    if (!this.draft || this.saving) return;
    this.saving = true;
    this.message = '';
    try {
      // Request directly in the Save click's gesture, before any storage or other async work.
      const granted = await browser.permissions.request({ origins: PAGE_SHORTCUT_ORIGINS });
      this.hasAccess = granted;
      if (!granted) {
        this.message = 'Allow website access to use this shortcut. Your saved shortcut has not changed.';
        return;
      }
      await pinShortcutItem.setValue(this.draft);
      this.message = 'Pin shortcut saved.';
    } catch {
      this.message = 'Could not save the shortcut. Try again.';
    } finally {
      this.saving = false;
    }
  }

  async clear(): Promise<void> {
    this.saving = true;
    this.message = '';
    try {
      await pinShortcutItem.setValue(null);
      // Required or managed website access cannot be revoked here. The shortcut is already disabled.
      await browser.permissions.remove({ origins: PAGE_SHORTCUT_ORIGINS }).catch(() => undefined);
      this.message = 'Custom pin shortcut removed.';
    } catch {
      this.message = 'Could not remove the shortcut. Try again.';
    } finally {
      this.saving = false;
    }
  }
}
