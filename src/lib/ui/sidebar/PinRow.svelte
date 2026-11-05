<script lang="ts">
  import { CornerUpLeft, Minus } from '@lucide/svelte';
  import { getSidebar } from '@/lib/model/context';
  import type { Pin } from '@/lib/model/types';
  import { sameUrl } from '@/lib/model/url';
  import IconButton from '../primitives/IconButton.svelte';
  import TabRow from '../primitives/TabRow.svelte';

  let { pin, depth = 0 }: { pin: Pin; depth?: number } = $props();

  const sidebar = getSidebar();
  const tab = $derived(pin.tabId !== undefined ? sidebar.tabs.get(pin.tabId) : undefined);
  /** The pin's tab has left its home URL: show where it is now, and offer a way back. */
  const away = $derived(tab !== undefined && tab.status === 'complete' && !sameUrl(tab.url, pin.url));
</script>

<TabRow
  title={away ? tab!.title : pin.title}
  url={tab?.url ?? pin.url}
  prefix={away ? '/' : undefined}
  active={tab !== undefined && tab.id === sidebar.activeTabId}
  unloaded={tab === undefined}
  loading={tab?.status === 'loading'}
  {depth}
  onactivate={() => sidebar.openPin(pin.id)}
>
  {#snippet leading()}
    {#if away}
      <IconButton label="Back to {pin.title}" solid onclick={() => sidebar.resetPin(pin.id)}>
        <CornerUpLeft size={14} strokeWidth={2.25} />
      </IconButton>
    {/if}
  {/snippet}
  {#snippet trailing()}
    {#if tab}
      <IconButton label="Close tab, keep pin" reveal onclick={() => sidebar.unloadPin(pin.id)}>
        <Minus size={14} strokeWidth={2.25} />
      </IconButton>
    {/if}
  {/snippet}
</TabRow>
