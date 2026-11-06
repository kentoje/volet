<script lang="ts">
  import { ContextMenu } from 'bits-ui';
  import { hasLeading, type MenuItem } from '@/lib/model/menu';
  import { MENU_ITEM_CLASS } from './item-class';
  import Leading from './Leading.svelte';
  import SubMenu from './SubMenu.svelte';
  import Swatches from './Swatches.svelte';
  import MenuItems from './MenuItems.svelte';

  interface Props {
    items: MenuItem[];
    /** Set by a group's parent list, so the group's labels line up with the rest of the menu. */
    column?: boolean;
  }

  let { items, column }: Props = $props();

  /** A list where no item has an icon skips the icon column instead of leaving a gap. */
  const iconColumn = $derived(
    column ?? items.some((item) => hasLeading(item) || (item.kind === 'group' && item.items.some(hasLeading))),
  );
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
  {:else if item.kind === 'group'}
    <ContextMenu.Group>
      <ContextMenu.GroupHeading class="px-2 pt-1.5 pb-1 text-[11px] font-medium text-ink-muted">
        {item.label}
      </ContextMenu.GroupHeading>
      <MenuItems items={item.items} column={iconColumn} />
    </ContextMenu.Group>
  {:else if item.kind === 'swatches'}
    <Swatches label={item.label} hues={item.hues} selected={item.selected} onSelect={item.onSelect} />
  {/if}
{/each}
