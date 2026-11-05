import type { Attachment } from 'svelte/attachments';
import { on } from 'svelte/events';

/**
 * Menus in a side panel that may not have focus.
 *
 * A left-click in the panel gives it focus, a right-click doesn't (on macOS), and no API
 * hands focus to a side panel. So a menu opened from the web page with a right-click lives
 * in an unfocused panel: it gets no focus events and never sees a click back in the page.
 */

/** How long the pointer may stay out of an unfocused panel before an open menu closes. */
export const LEAVE_GRACE_MS = 300;

/**
 * Attach to an open menu: it closes when the user goes to the web page. A click there
 * blurs the panel when it has focus; without focus, the pointer leaving the panel is the
 * only sign, so the menu closes unless the pointer comes back within a moment.
 */
export function dismissOutsidePanel(close: () => void): Attachment {
  return () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stay = () => clearTimeout(timer);
    const listeners = [
      on(window, 'blur', close),
      on(window, 'pointerout', (event) => {
        // No related target: the pointer left the panel altogether.
        if (event.relatedTarget !== null || document.hasFocus()) return;
        stay();
        timer = setTimeout(close, LEAVE_GRACE_MS);
      }),
      on(window, 'pointerover', stay),
    ];
    return () => {
      stay();
      for (const remove of listeners) remove();
    };
  };
}

/**
 * Attach to an open menu: while the panel has no focus, mark the document with
 * `data-unfocused`. Menu items highlight through focus (Bits UI focuses the hovered item),
 * which an unfocused panel never gets, so they highlight on hover instead (see
 * MENU_ITEM_CLASS). Once the panel has focus, focus drives it again, keyboard included.
 */
export const highlightWithoutFocus: Attachment = () => {
  const root = document.documentElement;
  const mark = () => root.toggleAttribute('data-unfocused', !document.hasFocus());
  mark();
  const listeners = [on(window, 'focus', mark), on(window, 'blur', mark)];
  return () => {
    for (const remove of listeners) remove();
    root.removeAttribute('data-unfocused');
  };
};
