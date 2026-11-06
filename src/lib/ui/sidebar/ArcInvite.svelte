<script lang="ts">
  import { getArcClient } from '@/lib/model/arc';
  import NoticeCard from '../primitives/NoticeCard.svelte';

  const arc = getArcClient();
</script>

<!-- After install, until dismissed or something is imported from Arc. -->
{#if arc?.invite}
  <NoticeCard
    title="Coming from Arc?"
    text="Bring your Spaces, pinned tabs and favorites in a few clicks."
    action="Import from Arc"
    onaction={() => arc.openImport()}
    ondismiss={() => arc.dismissInvite()}
  />
{/if}
