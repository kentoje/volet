import { pinShortcutItem } from '@/lib/engine/storage';
import { isPageShortcut, matchesPageShortcut, recordPageShortcut } from '@/lib/model/page-shortcut';

declare global {
  var __voletPinShortcutCleanup: (() => void) | undefined;
}

/** Installed only on websites the user granted access to for custom shortcuts. */
export default defineUnlistedScript(async () => {
  let shortcut = await pinShortcutItem.getValue();
  // Replace an earlier injection, including one left behind by an extension reload.
  globalThis.__voletPinShortcutCleanup?.();
  const unwatch = pinShortcutItem.watch((next) => (shortcut = next));
  const keydown = (event: KeyboardEvent) => {
    if (!browser.runtime.id || !event.isTrusted || !isPageShortcut(shortcut)) return;
    const pressed = recordPageShortcut(event);
    if (!pressed || !matchesPageShortcut(pressed, shortcut)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void browser.runtime.sendMessage({ type: 'shortcut:pin', shortcut: pressed }).catch(() => undefined);
  };
  window.addEventListener('keydown', keydown, { capture: true });
  globalThis.__voletPinShortcutCleanup = () => {
    window.removeEventListener('keydown', keydown, { capture: true });
    unwatch();
  };
});
