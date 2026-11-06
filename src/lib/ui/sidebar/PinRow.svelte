<script lang="ts">
  import { onDestroy } from 'svelte';
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
  /** The pin's tab has left its home URL: show where it is now, and offer a way back. */
  const away = $derived(tab !== undefined && tab.status === 'complete' && !sameUrl(tab.url, pin.url));

  /**
   * A closed pin clicked with the mouse opens after a short pause: a double-click renames it
   * instead. Opening at the first click would bring its tab to the front after the second, and
   * Chrome then gives the keyboard to the page, away from the name field. The row shows it's
   * loading meanwhile. Open pins, and the keyboard, open at once.
   */
  const OPEN_DELAY_MS = 300;
  let opening = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function cancelOpening() {
    clearTimeout(timer);
    opening = false;
  }

  function activate(event: MouseEvent) {
    if (selection.click(entry, event)) return;
    if (tab || event.detail === 0) return void sidebar.openPin(pin.id);
    if (event.detail > 1) return; // a double-click's second click: it renames (see ondblclick)
    opening = true;
    timer = setTimeout(() => {
      opening = false;
      void sidebar.openPin(pin.id);
    }, OPEN_DELAY_MS);
  }

  onDestroy(() => clearTimeout(timer));
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
    title={away ? tab!.title : pin.title}
    url={tab?.url ?? pin.url}
    icon={tab?.favIconUrl}
    prefix={away ? '/' : undefined}
    active={tab !== undefined && tab.id === sidebar.activeTabId}
    selected={selection.has(entry)}
    openMark={tab !== undefined}
    loading={opening || tab?.status === 'loading'}
    {depth}
    {handle}
    buttons={{ shown: 0, onHover: tab ? 2 : 1 }}
    leading={away ? backButton : undefined}
    editor={rename.is(pin.id) ? editor : undefined}
    onactivate={activate}
    ondblclick={() => {
      cancelOpening();
      rename.start(pin.id);
    }}
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
