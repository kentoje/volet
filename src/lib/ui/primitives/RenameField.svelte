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

  const focusAndSelect = (input: HTMLInputElement) => {
    input.focus();
    input.select();
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
