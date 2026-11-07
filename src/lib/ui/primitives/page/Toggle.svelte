<script lang="ts">
  let { checked, label, disabled = false, onchange }: {
    checked: boolean;
    label: string;
    disabled?: boolean;
    onchange: () => void;
  } = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  {disabled}
  onclick={onchange}
  class={[
    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border focus-visible:outline-2 focus-visible:outline-(--focus) disabled:cursor-wait disabled:opacity-40',
    checked ? 'border-transparent bg-(--focus)' : 'border-ink-muted/30 bg-rule',
  ]}
>
  <span class={['block size-[18px] rounded-full bg-white shadow-sm', checked ? 'translate-x-[22px]' : 'translate-x-[3px]']}></span>
</button>
