import type { RecentTabCycle } from '@/lib/model/recent-tab-cycle';
import { isPreviousTabShortcut, recentTabModifier, type CycleModifier, type RecentTabBindings } from '@/lib/model/recent-tab-shortcut';

/** Track modifier releases before Chrome sends a command, including during async loading. */
export function listenRecentTabKeys(cycle: RecentTabCycle, onstart: () => void): {
  configure: (bindings: RecentTabBindings) => void;
  step: (shortcut: string, offset?: 1 | -1) => void;
  dispose: () => void;
} {
  let held = { metaKey: false, ctrlKey: false, altKey: false };
  let modifier: CycleModifier | undefined;
  let shortcut = '';
  let previousShortcut = '';
  const keydown = (event: KeyboardEvent) => {
    held = event;
    if (!previousShortcut && isPreviousTabShortcut(event, shortcut)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) {
        modifier = recentTabModifier(shortcut);
        onstart();
        cycle.step(-1);
      }
      return;
    }
    if (!cycle.active) return;
    switch (event.key) {
      case 'Backspace':
      case 'Delete':
        if (!event.repeat) cycle.closeSelected();
        break;
      case 'Escape': cycle.cancel(); break;
      case 'Enter': {
        const target = event.composedPath()[0];
        // Cmd is still held, so handle Enter explicitly instead of relying on a native button click.
        if (target instanceof HTMLElement && target.classList.contains('recent-tab-close')) {
          if (!event.repeat) cycle.closeSelected();
        } else cycle.commit();
        break;
      }
      case 'ArrowRight': cycle.step(1); break;
      case 'ArrowLeft': cycle.step(-1); break;
      default: return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
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
    configure(bindings) {
      shortcut = bindings.next;
      previousShortcut = bindings.previous;
    },
    step(nextShortcut, offset = 1) {
      if (offset === 1) shortcut = nextShortcut;
      modifier = recentTabModifier(nextShortcut);
      cycle.step(offset);
      // The command may arrive after the user has already released Cmd.
      if (modifier && !held[modifier]) cycle.commit();
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
