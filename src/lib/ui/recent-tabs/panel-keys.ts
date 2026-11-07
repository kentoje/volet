import { recentTabKey, type PanelKey } from '@/lib/model/recent-tab-keys';
import type { CycleModifier } from '@/lib/model/recent-tab-shortcut';

const NOTHING_HELD = { metaKey: false, ctrlKey: false, altKey: false };

/**
 * The Volet panel's side of the recent tab switcher. With the panel focused, the page showing the switcher gets no key
 * events: it asks the panel whether the modifier is held (`holds`), and while it is, the panel sends it the keys.
 */
export function watchPanelRecentTabKeys(send: (tabId: number, key: PanelKey) => void): {
  configure: (closeShortcut: string) => void;
  holds: (tabId: number, modifier: CycleModifier) => boolean;
  dispose: () => void;
} {
  let held = NOTHING_HELD;
  let watching: { tabId: number; modifier: CycleModifier } | undefined;
  let closeShortcut = '';
  const report = (key: PanelKey, last = false) => {
    if (!watching) return;
    send(watching.tabId, key);
    if (last) watching = undefined;
  };
  const keydown = (event: KeyboardEvent) => {
    held = event;
    if (!watching) return;
    const key = recentTabKey(event, closeShortcut);
    if (!key) return;
    // The switcher has these keys while it's open: the sidebar's own handlers never see them.
    event.preventDefault();
    event.stopImmediatePropagation();
    if (key === 'close' && event.repeat) return;
    report(key, key === 'cancel' || key === 'choose');
  };
  const keyup = (event: KeyboardEvent) => {
    held = event;
    if (watching && !event[watching.modifier]) report('release', true);
  };
  const blur = () => {
    held = NOTHING_HELD;
    report('leave', true);
  };
  window.addEventListener('keydown', keydown, true);
  window.addEventListener('keyup', keyup, true);
  window.addEventListener('blur', blur);
  return {
    configure(value) { closeShortcut = value; },
    holds(tabId, modifier) {
      if (!held[modifier]) return false;
      watching = { tabId, modifier };
      return true;
    },
    dispose() {
      window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('keyup', keyup, true);
      window.removeEventListener('blur', blur);
    },
  };
}
