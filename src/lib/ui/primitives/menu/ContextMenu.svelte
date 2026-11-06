<script lang="ts">
  import { ContextMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import type { MenuItem } from '@/lib/model/menu';
  import { OVERLAY_ROOT } from '../overlay';
  import { dismissOutsidePanel, highlightWithoutFocus } from './dismiss';
  import MenuItems from './MenuItems.svelte';
  import { MENU_PLACEMENT } from './placement';

  interface Props {
    /** Built when the menu opens, so it always reflects the current state. */
    items: () => MenuItem[];
    children: Snippet;
  }

  let { items, children }: Props = $props();
  let open = $state(false);

  /** A click in the page is invisible here: close when the panel loses focus, or the pointer leaves it (see dismiss.ts). */
  const dismiss = dismissOutsidePanel(() => (open = false));

  /**
   * Closing sends focus back to where it was before the menu opened. An item that opened a text
   * field (an inline rename) keeps the focus it gave it instead: taking it away would end the edit.
   */
  const keepFieldFocus = (event: Event) => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) event.preventDefault();
  };

  /**
   * While the menu is open, the row it opened on keeps its hover look, even with the pointer
   * in the menu (rows style `data-hovered` like hover, see TabRow). Re-runs when `open` changes.
   */
  const keepHovered: Attachment<HTMLElement> = (trigger) => {
    const row = trigger.firstElementChild;
    if (!open || !row) return;
    row.setAttribute('data-hovered', '');
    return () => row.removeAttribute('data-hovered');
  };
</script>

<!-- Right-click (or the context menu key) on `children` opens the menu. -->
<ContextMenu.Root bind:open>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <div {...props} {@attach keepHovered}>
        {@render children()}
      </div>
    {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Portal to={OVERLAY_ROOT}>
    <!-- Placed by MENU_PLACEMENT: below the pointer, sliding and flipping to stay on screen. -->
    <ContextMenu.Content class="menu-surface" data-no-drag {...MENU_PLACEMENT} onCloseAutoFocus={keepFieldFocus}>
      {#snippet child({ wrapperProps, props })}
        <div {...wrapperProps}>
          <div {...props} {@attach dismiss} {@attach highlightWithoutFocus}>
            {#if open}
              <MenuItems items={items()} />
            {/if}
          </div>
        </div>
      {/snippet}
    </ContextMenu.Content>
  </ContextMenu.Portal>
</ContextMenu.Root>
