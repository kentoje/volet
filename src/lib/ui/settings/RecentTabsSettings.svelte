<script lang="ts">
  import { RecentTabsToggle } from '@/lib/state/recent-tabs-toggle.svelte';
  import Button from '../primitives/page/Button.svelte';
  import { RecentTabsSettings } from '@/lib/state/recent-tabs-settings.svelte';
  import Toggle from '../primitives/page/Toggle.svelte';
  import Card from '../primitives/page/Card.svelte';

  const settings = new RecentTabsSettings();
  const toggle = new RecentTabsToggle();
  void settings.load();
</script>

<svelte:window onfocus={() => void settings.load()} />

<Card title="Recent tabs">
  <p class="text-[14px]">Cycle through your five most recent tabs across Volets in this window.</p>
  <p class="mt-3 text-[13px] leading-relaxed text-ink-muted">
    Hold the shortcut's modifier and press it again to go further back, then let go to switch. Change the back and
    forward shortcuts under Keyboard shortcuts. Use the toggle to turn the switcher off without clearing your bindings.
  </p>
  <p class="mt-3 text-[13px] leading-relaxed text-ink-muted">
    To notice when you let go, Volet listens for keys on websites, and it keeps temporary previews of the pages you
    visit on this device, none while the switcher is off or both shortcuts are removed. Chrome pages and the Web Store switch to the previous
    tab without a preview.
  </p>
  <div class="mt-4 flex items-center justify-between gap-3" {@attach () => toggle.watch()}>
    <span class="text-[13px] text-ink-muted" aria-live="polite">{toggle.busy ? 'Updating...' : toggle.enabled ? 'Enabled' : 'Disabled'}</span>
    <Toggle label="Enable tab switcher" checked={toggle.enabled} disabled={toggle.busy} onchange={() => void toggle.toggle()} />
  </div>
  {#if !settings.access}
    <div class="mt-4 flex items-center justify-between gap-3">
      <p class="text-[13px] leading-relaxed">Chrome doesn't let Volet read websites, so tab switching is off.</p>
      <Button disabled={settings.busy} onclick={() => void settings.allow()}>
        {settings.busy ? 'Updating...' : 'Allow website access'}
      </Button>
    </div>
  {/if}
  {#if toggle.error}<p role="alert" class="mt-3 text-[13px]">{toggle.error}</p>{/if}
  {#if settings.error}<p role="alert" class="mt-3 text-[13px]">{settings.error}</p>{/if}
</Card>
