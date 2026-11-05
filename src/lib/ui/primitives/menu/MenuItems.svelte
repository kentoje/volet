<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';
  import { ContextMenu } from 'bits-ui';
  import type { MenuItem } from '@/lib/model/menu';
  import { OVERLAY_ROOT } from '../overlay';
  import MenuItems from './MenuItems.svelte';
  import Swatches from './Swatches.svelte';

  let { items }: { items: MenuItem[] } = $props();

  const itemClass =
    'flex h-8 cursor-default items-center gap-2.5 rounded-md px-2 text-[13px] outline-none select-none data-disabled:opacity-40 data-highlighted:bg-hover';
</script>

{#each items as item, index (index)}
  {#if item.kind === 'separator'}
    <ContextMenu.Separator class="mx-1 my-1 h-px bg-rule" />
  {:else if item.kind === 'action'}
    <ContextMenu.Item
      class={[itemClass, item.destructive && 'text-(--danger)']}
      disabled={item.disabled}
      onSelect={item.onSelect}
    >
      <span class="grid size-4 place-items-center text-ink-muted">
        {#if item.icon}<item.icon size={14} strokeWidth={2} />{/if}
      </span>
      {item.label}
    </ContextMenu.Item>
  {:else if item.kind === 'submenu'}
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger class={[itemClass, 'data-[state=open]:bg-hover']} disabled={item.items.length === 0}>
        <span class="grid size-4 place-items-center text-ink-muted">
          {#if item.icon}<item.icon size={14} strokeWidth={2} />{/if}
        </span>
        <span class="flex-1">{item.label}</span>
        <ChevronRight size={14} class="text-ink-muted" />
      </ContextMenu.SubTrigger>
      <ContextMenu.Portal to={OVERLAY_ROOT}>
        <ContextMenu.SubContent class="menu-surface" sideOffset={4}>
          <MenuItems items={item.items} />
        </ContextMenu.SubContent>
      </ContextMenu.Portal>
    </ContextMenu.Sub>
  {:else if item.kind === 'swatches'}
    <Swatches label={item.label} hues={item.hues} selected={item.selected} onSelect={item.onSelect} />
  {/if}
{/each}
