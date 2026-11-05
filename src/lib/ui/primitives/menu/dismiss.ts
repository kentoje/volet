import type { Attachment } from 'svelte/attachments';
import { on } from 'svelte/events';

/** How long the pointer may stay out of an unfocused panel before an open menu closes. */
export const LEAVE_GRACE_MS = 300;

/**
 * Attach to a menu while it is open: it closes when the user goes to the web page.
 *
 * A click in the page only reaches the panel as a blur, and only if the panel had focus.
 * Opening a menu with a right-click doesn't give the panel focus (on macOS), so the menu
 * asks for it. If the panel still doesn't have it, the pointer leaving the panel is the
 * only sign left: the menu closes unless the pointer comes back within a moment.
 */
export function dismissOutsidePanel(close: () => void): Attachment {
  return () => {
    // Allowed here: the right-click that opened the menu counts as a user gesture.
    if (!document.hasFocus()) window.focus();
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
