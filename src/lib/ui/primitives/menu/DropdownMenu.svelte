<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import type { MenuItem } from '@/lib/model/menu';
  import { OVERLAY_ROOT } from '../overlay';
  import { dismissOutsidePanel, highlightWithoutFocus } from './dismiss';
  import MenuItems from './MenuItems.svelte';
  import { MENU_PLACEMENT } from './placement';

  interface Props {
    /** Built when the menu opens, so it always reflects the current state. */
    items: () => MenuItem[];
    /** The button that opens the menu: spread `props` onto it. */
    trigger: Snippet<[Record<string, unknown>]>;
  }

  let { items, trigger }: Props = $props();
  let open = $state(false);

  /** Like a context menu: close when the panel loses focus, or the pointer leaves it (see dismiss.ts). */
  const dismiss = dismissOutsidePanel(() => (open = false));
</script>

<!-- A click on the trigger opens the menu; it's placed like every menu (MENU_PLACEMENT). -->
<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      {@render trigger(props)}
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal to={OVERLAY_ROOT}>
    <DropdownMenu.Content class="menu-surface" data-no-drag {...MENU_PLACEMENT}>
      {#snippet child({ wrapperProps, props })}
        <div {...wrapperProps}>
          <div {...props} {@attach dismiss} {@attach highlightWithoutFocus}>
            {#if open}
              <MenuItems items={items()} />
            {/if}
          </div>
        </div>
      {/snippet}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
