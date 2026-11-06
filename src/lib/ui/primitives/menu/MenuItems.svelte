<script lang="ts">
  import { ContextMenu } from 'bits-ui';
  import { hasLeading, type MenuItem } from '@/lib/model/menu';
  import { MENU_ITEM_CLASS } from './item-class';
  import Leading from './Leading.svelte';
  import SubMenu from './SubMenu.svelte';
  import Swatches from './Swatches.svelte';

  let { items }: { items: MenuItem[] } = $props();

  /** A list where no item has an icon skips the icon column instead of leaving a gap. */
  const iconColumn = $derived(items.some(hasLeading));
</script>

{#each items as item, index (index)}
  {#if item.kind === 'separator'}
    <ContextMenu.Separator class="mx-1 my-1 h-px bg-rule" />
  {:else if item.kind === 'action'}
    <ContextMenu.Item
      class={[MENU_ITEM_CLASS, item.destructive && 'text-(--danger)']}
      disabled={item.disabled}
      onSelect={item.onSelect}
    >
      {#if iconColumn}<Leading icon={item.icon} hue={item.hue} />{/if}
      {item.label}
    </ContextMenu.Item>
  {:else if item.kind === 'submenu'}
    <SubMenu {item} {iconColumn} />
  {:else if item.kind === 'swatches'}
    <Swatches label={item.label} hues={item.hues} selected={item.selected} onSelect={item.onSelect} />
  {/if}
{/each}
