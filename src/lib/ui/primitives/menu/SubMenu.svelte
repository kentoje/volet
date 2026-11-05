<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';
  import { ContextMenu } from 'bits-ui';
  import { prefersReducedMotion } from 'svelte/motion';
  import { slide } from 'svelte/transition';
  import type { MenuItem } from '@/lib/model/menu';
  import { MENU_ITEM_CLASS } from './item-class';
  import MenuItems from './MenuItems.svelte';

  /**
   * A submenu that expands in place, under its item, pushing the items below down. A side
   * panel has no room beside the menu, and a submenu laid over it would hide those items.
   * It opens on click, Enter or →, not on hover, so the menu doesn't change shape under a
   * passing pointer; ← collapses it.
   */
  let { item }: { item: Extract<MenuItem, { kind: 'submenu' }> } = $props();

  const id = $props.id();
  let expanded = $state(false);
  let trigger = $state<HTMLElement | null>(null);
  const duration = $derived(prefersReducedMotion.current ? 0 : 140);

  function onTriggerKey(event: KeyboardEvent) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    expanded = event.key === 'ArrowRight';
    event.preventDefault();
  }

  /** ← on one of its items closes the submenu and goes back to its item. */
  function onItemsKey(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft') return;
    event.preventDefault();
    event.stopPropagation(); // only the innermost submenu
    expanded = false;
    trigger?.focus();
  }
</script>

<ContextMenu.Item
  bind:ref={trigger}
  class={MENU_ITEM_CLASS}
  disabled={item.items.length === 0}
  closeOnSelect={false}
  aria-expanded={expanded}
  aria-controls={id}
  onSelect={() => (expanded = !expanded)}
  onkeydown={onTriggerKey}
>
  <span class="grid size-4 place-items-center text-ink-muted">
    {#if item.icon}<item.icon size={14} strokeWidth={2} />{/if}
  </span>
  <span class="flex-1">{item.label}</span>
  <ChevronRight
    size={14}
    class={['text-ink-muted transition-transform duration-150 motion-reduce:transition-none', expanded && 'rotate-90']}
  />
</ContextMenu.Item>
{#if expanded}
  <!-- Indented so its items' labels start under this item's label. -->
  <div transition:slide={{ duration }}>
    <ContextMenu.Group {id} aria-label={item.label} class="pl-[26px]" onkeydown={onItemsKey}>
      <MenuItems items={item.items} />
    </ContextMenu.Group>
  </div>
{/if}
