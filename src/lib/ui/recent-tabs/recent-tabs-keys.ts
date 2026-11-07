import type { RecentTabCycle } from '@/lib/model/recent-tab-cycle';
import { recentTabKey, type PanelKey, type RecentTabKey } from '@/lib/model/recent-tab-keys';
import { recentTabModifier, type CycleModifier } from '@/lib/model/recent-tab-shortcut';

/** Who sees the modifier during a gesture: this page, the Volet panel (focused instead), or not known yet. */
interface Watcher { by: 'page' | 'panel' | 'asking' }

/**
 * Track modifier releases before Chrome sends a command, including during async loading. When the page didn't see
 * the modifier go down, the Volet panel may have focus and hold it (`panelHolds`): it then reports its keys here.
 */
export function listenRecentTabKeys(cycle: RecentTabCycle, panelHolds: (modifier: CycleModifier) => Promise<boolean>): {
  configure: (closeShortcut: string) => void;
  step: (shortcut: string, offset?: 1 | -1) => void;
  fromPanel: (key: PanelKey) => void;
  dispose: () => void;
} {
  let held = { metaKey: false, ctrlKey: false, altKey: false };
  let modifier: CycleModifier | undefined;
  /** One per gesture, so an answer arriving after the gesture changed can tell. */
  let watcher: Watcher | undefined;
  let closeShortcut = '';
  const press = (key: RecentTabKey, repeat = false) => {
    switch (key) {
      case 'close': if (!repeat) cycle.closeSelected(); break;
      case 'cancel': cycle.cancel(); break;
      case 'choose': cycle.commit(); break;
      case 'next': cycle.step(1); break;
      case 'previous': cycle.step(-1); break;
    }
  };
  const keydown = (event: KeyboardEvent) => {
    held = event;
    if (!cycle.active) return;
    const key = recentTabKey(event, closeShortcut);
    if (!key) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const target = event.composedPath()[0];
    // Cmd is still held, so handle Enter on the close button here instead of relying on a native button click.
    const onClose = key === 'choose' && target instanceof HTMLElement && target.classList.contains('recent-tab-close');
    press(onClose ? 'close' : key, event.repeat);
  };
  const keyup = (event: KeyboardEvent) => {
    held = event;
    if (modifier && !held[modifier]) cycle.commit();
  };
  const cancel = () => {
    held = { metaKey: false, ctrlKey: false, altKey: false };
    cycle.cancel();
  };
  const visibility = () => { if (document.hidden) cancel(); };
  window.addEventListener('keydown', keydown, true);
  window.addEventListener('keyup', keyup, true);
  window.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', visibility);
  return {
    configure(value) { closeShortcut = value; },
    step(nextShortcut, offset = 1) {
      modifier = recentTabModifier(nextShortcut);
      if (!cycle.active) watcher = undefined;
      cycle.step(offset);
      if (!modifier || watcher?.by === 'panel' || watcher?.by === 'asking') return;
      if (held[modifier]) {
        watcher = { by: 'page' };
        return;
      }
      // The command may arrive after the user has already released Cmd.
      if (watcher) {
        cycle.commit();
        return;
      }
      // This page never saw the modifier: the focused Volet panel may hold it, otherwise it was a quick tap.
      const asking: Watcher = { by: 'asking' };
      watcher = asking;
      void panelHolds(modifier).catch(() => false).then((holds) => {
        if (watcher !== asking || asking.by !== 'asking') return;
        if (holds) asking.by = 'panel';
        else cycle.commit();
      });
    },
    fromPanel(key) {
      if (!cycle.active || !watcher || watcher.by === 'page') return;
      // The panel only reports keys once it has answered that it holds the modifier; the answer may still be on its way.
      watcher.by = 'panel';
      if (key === 'release') cycle.commit();
      // Focus left the panel: keep going only if it came here (a click on the switcher), where this page's keys take over.
      else if (key === 'leave') { if (!document.hasFocus()) cycle.cancel(); }
      else press(key);
    },
    dispose() {
      cancel();
      window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('keyup', keyup, true);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
