<script lang="ts">
  import type { MenuIcon } from '@/lib/model/menu';

  let { icon: Icon, hue }: { icon?: MenuIcon; hue?: number } = $props();
</script>

<!-- The icon column, before an item's label: an icon, a color dot, or empty to keep labels aligned. -->
<span class="grid size-4 place-items-center text-ink-muted">
  {#if Icon}
    <Icon size={14} strokeWidth={2} />
  {:else if hue !== undefined}
    <span class="block size-2 rounded-full" style:background="oklch(var(--dot-l) var(--dot-c) {hue})"></span>
  {/if}
</span>
