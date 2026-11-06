<script lang="ts">
  interface Props {
    value: string;
    label: string;
    /** Called with the new name (trimmed, non-empty, changed). */
    oncommit: (value: string) => void;
    /** Called when editing ends without a change. */
    oncancel: () => void;
    class?: string;
  }

  let { value, label, oncommit, oncancel, class: className = '' }: Props = $props();

  let done = false;

  function finish(next: string | undefined) {
    if (done) return;
    done = true;
    const trimmed = next?.trim();
    if (trimmed && trimmed !== value) oncommit(trimmed);
    else oncancel();
  }

  /**
   * Focus the field and select its text. Inside an inert page (a Volet still sliding into view),
   * focus can't land yet: wait until the page stops being inert.
   */
  const focusAndSelect = (input: HTMLInputElement) => {
    const focus = () => {
      input.focus();
      input.select();
      return document.activeElement === input;
    };
    if (focus()) return;
    const page = input.closest('[inert]');
    if (!page) return;
    const observer = new MutationObserver(() => {
      if (!page.hasAttribute('inert') && focus()) observer.disconnect();
    });
    observer.observe(page, { attributes: true, attributeFilter: ['inert'] });
    return () => observer.disconnect();
  };
</script>

<!-- Inline rename: Enter saves, Escape cancels, clicking away saves. -->
<input
  class={['w-full min-w-0 rounded-md bg-pill px-1.5 py-0.5 text-inherit outline-2 outline-(--focus)', className]}
  aria-label={label}
  {value}
  data-no-drag
  onkeydown={(event) => {
    if (event.key === 'Enter') finish(event.currentTarget.value);
    if (event.key === 'Escape') finish(undefined);
    event.stopPropagation();
  }}
  onblur={(event) => finish(event.currentTarget.value)}
  onclick={(event) => event.stopPropagation()}
  {@attach focusAndSelect}
/>
