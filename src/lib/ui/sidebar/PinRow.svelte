<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { CornerUpLeft, Minus } from '@lucide/svelte';
  import type { Pin } from '@/lib/model/types';
  import { sameUrl } from '@/lib/model/url';
  import IconButton from '../primitives/IconButton.svelte';
  import ContextMenu from '../primitives/menu/ContextMenu.svelte';
  import RenameField from '../primitives/RenameField.svelte';
  import TabRow from '../primitives/TabRow.svelte';
  import { getMenuContext } from './menus/menu-context';
  import { pinMenu } from './menus/pin-menu';

  let { pin, depth = 0, handle }: { pin: Pin; depth?: number; handle?: Attachment<HTMLElement> } = $props();

  const menus = getMenuContext();
  const { store: sidebar, rename } = menus;
  const tab = $derived(pin.tabId !== undefined ? sidebar.tabs.get(pin.tabId) : undefined);
  /** The pin's tab has left its home URL: show where it is now, and offer a way back. */
  const away = $derived(tab !== undefined && tab.status === 'complete' && !sameUrl(tab.url, pin.url));
</script>

{#snippet editor()}
  <RenameField
    value={pin.title}
    label="Pin name"
    oncommit={(title) => {
      rename.stop();
      void sidebar.renameNode(pin.id, title);
    }}
    oncancel={() => rename.stop()}
  />
{/snippet}

<ContextMenu items={() => pinMenu(pin, away, menus)}>
  <TabRow
    title={away ? tab!.title : pin.title}
    url={tab?.url ?? pin.url}
    prefix={away ? '/' : undefined}
    active={tab !== undefined && tab.id === sidebar.activeTabId}
    unloaded={tab === undefined}
    loading={tab?.status === 'loading'}
    {depth}
    {handle}
    editor={rename.is(pin.id) ? editor : undefined}
    onactivate={() => sidebar.openPin(pin.id)}
    ondblclick={() => rename.start(pin.id)}
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
</ContextMenu>
