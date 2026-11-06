<script lang="ts">
  import type { MenuItem } from '@/lib/model/menu';
  import { dismissOutsidePanel, highlightWithoutFocus } from './dismiss';
  import MenuItems from './MenuItems.svelte';

  interface Props {
    /** What Bits UI's menu content hands its `child` snippet: spread on the wrapper and the menu. */
    wrapperProps: Record<string, unknown>;
    props: Record<string, unknown>;
    open: boolean;
    /** Built when the menu opens, so it always reflects the current state. */
    items: () => MenuItem[];
    onclose: () => void;
  }

  let { wrapperProps, props, open, items, onclose }: Props = $props();

  /** A click in the page is invisible here: close when the panel loses focus, or the pointer leaves it (see dismiss.ts). */
  const dismiss = dismissOutsidePanel(() => onclose());
</script>

<!-- The body every menu shares: it works in an unfocused panel, and builds its items only while open. -->
<div {...wrapperProps}>
  <div {...props} {@attach dismiss} {@attach highlightWithoutFocus}>
    {#if open}
      <MenuItems items={items()} />
    {/if}
  </div>
</div>
