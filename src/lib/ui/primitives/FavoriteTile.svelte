<script lang="ts">
  import { Volume2 } from '@lucide/svelte';
  import type { Attachment } from 'svelte/attachments';
  import Favicon from './Favicon.svelte';

  interface Props {
    label: string;
    url: string;
    /** The icon Chrome shows on the open tab, if any. */
    icon?: string;
    /** Tooltip: the live page title when open. */
    title?: string;
    active?: boolean;
    playing?: boolean;
    onclick: () => void;
    /** Attached to the button (e.g. to make it a drag handle). */
    handle?: Attachment<HTMLElement>;
  }

  let { label, url, icon, title, active = false, playing = false, onclick, handle }: Props = $props();
</script>

<button
  type="button"
  class={[
    'relative grid h-11 w-full place-items-center rounded-xl transition-[background-color,box-shadow] duration-100',
    active ? 'bg-pill shadow-(--pill-shadow)' : 'bg-tile hover:bg-pill data-hovered:bg-pill',
  ]}
  aria-label={label}
  aria-current={active ? 'page' : undefined}
  data-row
  title={title ?? label}
  {onclick}
  {@attach handle}
>
  <!-- 16px like rows: most favicons are 32px bitmaps (sites drawing a count or a date on theirs too),
       exact on a 2x screen at this size, and soft when stretched to fill a bigger one. -->
  <Favicon {url} {icon} size={16} />
  {#if playing}
    <span class="absolute right-1 bottom-1 text-ink-muted" aria-label="Playing audio">
      <Volume2 size={11} strokeWidth={2.25} />
    </span>
  {/if}
</button>
