<script lang="ts">
  import { ContextMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import type { MenuItem } from '@/lib/model/menu';
  import { OVERLAY_ROOT } from '../overlay';
  import MenuItems from './MenuItems.svelte';

  interface Props {
    /** Built when the menu opens, so it always reflects the current state. */
    items: () => MenuItem[];
    children: Snippet;
  }

  let { items, children }: Props = $props();
  let open = $state(false);
</script>

<!-- Right-click (or the context menu key) on `children` opens the menu. -->
<ContextMenu.Root bind:open>
  <ContextMenu.Trigger class="block">
    {@render children()}
  </ContextMenu.Trigger>
  <ContextMenu.Portal to={OVERLAY_ROOT}>
    <ContextMenu.Content class="menu-surface" data-no-drag>
      {#if open}
        <MenuItems items={items()} />
      {/if}
    </ContextMenu.Content>
  </ContextMenu.Portal>
</ContextMenu.Root>
