<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';
  import { ContextMenu } from 'bits-ui';
  import type { MenuItem } from '@/lib/model/menu';
  import { OVERLAY_ROOT } from '../overlay';
  import { MENU_ITEM_CLASS } from './item-class';
  import MenuItems from './MenuItems.svelte';
  import { type SubmenuSide, submenuPlacement, submenuSide } from './placement';

  let { item }: { item: Extract<MenuItem, { kind: 'submenu' }> } = $props();

  let trigger = $state<HTMLElement | null>(null);
  /** Chosen each time it opens, from where its item is (see submenuSide). */
  let side = $state<SubmenuSide>('right');
</script>

<ContextMenu.Sub
  onOpenChange={(open) => {
    if (open && trigger) side = submenuSide(trigger.getBoundingClientRect(), window.innerWidth);
  }}
>
  <ContextMenu.SubTrigger
    bind:ref={trigger}
    class={[MENU_ITEM_CLASS, 'data-[state=open]:bg-hover']}
    disabled={item.items.length === 0}
  >
    <span class="grid size-4 place-items-center text-ink-muted">
      {#if item.icon}<item.icon size={14} strokeWidth={2} />{/if}
    </span>
    <span class="flex-1">{item.label}</span>
    <ChevronRight size={14} class={['text-ink-muted transition-transform', side === 'bottom' && 'rotate-90']} />
  </ContextMenu.SubTrigger>
  <ContextMenu.Portal to={OVERLAY_ROOT}>
    <ContextMenu.SubContent class="menu-surface" {...submenuPlacement(side)}>
      <MenuItems items={item.items} />
    </ContextMenu.SubContent>
  </ContextMenu.Portal>
</ContextMenu.Sub>
