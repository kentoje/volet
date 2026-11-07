<script lang="ts">
  import { formatPageShortcut, recordPageShortcut, type PageShortcut } from '@/lib/model/page-shortcut';

  interface Props {
    label: string;
    value: PageShortcut | null;
    disabled?: boolean;
    onchange: (shortcut: PageShortcut) => void;
  }

  let { label, value, disabled = false, onchange }: Props = $props();
  let recording = $state(false);

  function record(event: KeyboardEvent): void {
    if (event.key === 'Tab') return;
    if (event.key === 'Escape') {
      if (event.currentTarget instanceof HTMLInputElement) event.currentTarget.blur();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const shortcut = recordPageShortcut(event);
    if (shortcut) onchange(shortcut);
  }
</script>

<label class="flex flex-col gap-2 text-[14px]">
  {label}
  <input
    type="text"
    readonly
    {disabled}
    class="h-10 w-full rounded-lg bg-hover px-3 text-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus) disabled:opacity-40"
    value={value ? formatPageShortcut(value) : ''}
    placeholder={recording ? 'Press a shortcut' : 'Click and press a shortcut'}
    onfocus={() => (recording = true)}
    onblur={() => (recording = false)}
    onkeydown={record}
  />
</label>
