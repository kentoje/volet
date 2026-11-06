<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { CornerUpLeft, PinOff, X } from '@lucide/svelte';
  import type { Pin, SpaceItem } from '@/lib/model/types';
  import { sameUrl, shortUrl } from '@/lib/model/url';
  import { spaceOfNode } from '@/lib/state/tree';
  import IconButton from '../primitives/IconButton.svelte';
  import ContextMenu from '../primitives/menu/ContextMenu.svelte';
  import RenameField from '../primitives/RenameField.svelte';
  import TabRow from '../primitives/TabRow.svelte';
  import { getMenuContext } from './menus/menu-context';
  import { pinMenu } from './menus/pin-menu';
  import { rowMenu } from './menus/selection-menu';

  let { pin, depth = 0, handle }: { pin: Pin; depth?: number; handle?: Attachment<HTMLElement> } = $props();

  const menus = getMenuContext();
  const { store: sidebar, rename, selection } = menus;
  const entry = $derived<SpaceItem>({ kind: 'node', id: pin.id });
  const space = $derived(spaceOfNode(sidebar.spaces, pin.id));
  const tab = $derived(pin.tabId !== undefined ? sidebar.tabs.get(pin.tabId) : undefined);
  /** The pin's tab has left its home URL: offer a way back. */
  const away = $derived(tab !== undefined && tab.status === 'complete' && !sameUrl(tab.url, pin.url));
  /** Away, a pin titled after its page shows the page it's on instead; a pin someone named keeps its name. */
  const showsPage = $derived(away && !pin.named);
</script>

{#snippet backButton()}
  <IconButton
    label="Back to the pinned page"
    hint="Back to the pinned page: {shortUrl(pin.url)}"
    onclick={() => sidebar.resetPin(pin.id)}
  >
    <CornerUpLeft size={14} strokeWidth={2.25} />
  </IconButton>
{/snippet}

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

<ContextMenu items={() => rowMenu(entry, menus, () => pinMenu(pin, away, menus))}>
  <TabRow
    title={showsPage && tab ? tab.title : pin.title}
    url={tab?.url ?? pin.url}
    icon={tab?.favIconUrl}
    prefix={showsPage ? '/' : undefined}
    active={tab !== undefined && tab.id === sidebar.activeTabId}
    selected={selection.has(entry)}
    openMark={tab !== undefined}
    loading={tab?.status === 'loading'}
    {depth}
    {handle}
    buttons={{ shown: 0, onHover: tab ? 2 : 1 }}
    leading={away ? backButton : undefined}
    editor={rename.is(pin.id) ? editor : undefined}
    onactivate={(event) => {
      if (!selection.click(entry, event)) sidebar.openPin(pin.id);
    }}
    ondblclick={() => rename.start(pin.id)}
  >
    {#snippet trailing()}
      {#if space}
        <IconButton label="Unpin" hint="Unpin (it moves to the tabs below)" reveal onclick={() => sidebar.unpin(pin.id, space.id)}>
          <PinOff size={14} strokeWidth={2} />
        </IconButton>
      {/if}
      {#if tab}
        <IconButton label="Close tab" hint="Close tab (it stays pinned)" reveal onclick={() => sidebar.unloadPin(pin.id)}>
          <X size={14} strokeWidth={2.25} />
        </IconButton>
      {/if}
    {/snippet}
  </TabRow>
</ContextMenu>
