<script lang="ts">
  import { onMount } from 'svelte';
  import { PinShortcutSettingsStore } from '@/lib/state/pin-shortcut-settings.svelte';
  import ShortcutRecorder from '../primitives/ShortcutRecorder.svelte';
  import Button from '../primitives/page/Button.svelte';

  const settings = new PinShortcutSettingsStore();
  onMount(() => settings.start());
</script>

<div class="mt-5 border-t border-rule pt-5">
  <ShortcutRecorder
    label="Custom pin shortcut"
    value={settings.draft}
    disabled={!settings.loaded || settings.saving}
    onchange={(shortcut) => {
      settings.draft = shortcut;
      settings.message = '';
    }}
  />
  <p class="mt-2 text-[13px] leading-relaxed text-ink-muted">
    Pin or unpin the current tab with a character key and Cmd, Ctrl or Alt, with optional Shift.
    Punctuation such as Cmd+\ and Cmd+Shift+\ works too. The physical key and modifiers are saved on this device.
  </p>
  <p class="mt-2 text-[13px] leading-relaxed text-ink-muted">
    Save asks for website access so this shortcut works while a web page has focus, including text fields.
    It cannot run in the address bar, Chrome pages, the Web Store or the sidebar. Chrome shortcuts above still work there.
  </p>
  {#if settings.shortcut && !settings.hasAccess}
    <p class="mt-2 text-[13px] text-ink-muted">Website access is off. Save to enable this shortcut.</p>
  {/if}
  <div class="mt-3 flex flex-wrap justify-end gap-2">
    {#if settings.shortcut}
      <Button disabled={settings.saving} onclick={() => void settings.clear()}>Remove custom shortcut</Button>
    {/if}
    <Button primary disabled={!settings.draft || settings.saving} onclick={() => void settings.save()}>Save pin shortcut</Button>
  </div>
  <p role="status" class="mt-2 text-[13px] text-ink-muted">{settings.message}</p>
</div>
