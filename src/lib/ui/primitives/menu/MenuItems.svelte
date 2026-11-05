<script lang="ts">
  import { ContextMenu } from 'bits-ui';
  import type { MenuItem } from '@/lib/model/menu';
  import { MENU_ITEM_CLASS } from './item-class';
  import SubMenu from './SubMenu.svelte';
  import Swatches from './Swatches.svelte';

  let { items }: { items: MenuItem[] } = $props();
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
      <span class="grid size-4 place-items-center text-ink-muted">
        {#if item.icon}<item.icon size={14} strokeWidth={2} />{/if}
      </span>
      {item.label}
    </ContextMenu.Item>
  {:else if item.kind === 'submenu'}
    <SubMenu {item} />
  {:else if item.kind === 'swatches'}
    <Swatches label={item.label} hues={item.hues} selected={item.selected} onSelect={item.onSelect} />
  {/if}
{/each}
