<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { Volume2, VolumeX, X } from '@lucide/svelte';
  import { getSidebar } from '@/lib/model/context';
  import type { LiveTab } from '@/lib/model/types';
  import IconButton from '../primitives/IconButton.svelte';
  import TabRow from '../primitives/TabRow.svelte';

  let { tab, depth = 0, handle }: { tab: LiveTab; depth?: number; handle?: Attachment<HTMLElement> } = $props();

  const sidebar = getSidebar();
</script>

<TabRow
  title={tab.title}
  url={tab.url}
  active={tab.id === sidebar.activeTabId}
  loading={tab.status === 'loading'}
  {depth}
  {handle}
  onactivate={() => sidebar.activateTab(tab.id)}
>
  {#snippet trailing()}
    {#if tab.audible}
      <IconButton label={tab.muted ? 'Unmute tab' : 'Mute tab'} onclick={() => sidebar.toggleMute(tab.id)}>
        {#if tab.muted}<VolumeX size={14} />{:else}<Volume2 size={14} />{/if}
      </IconButton>
    {/if}
    <IconButton label="Close tab" reveal onclick={() => sidebar.closeTab(tab.id)}>
      <X size={14} strokeWidth={2.25} />
    </IconButton>
  {/snippet}
</TabRow>
