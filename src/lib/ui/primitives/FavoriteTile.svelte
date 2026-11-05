<script lang="ts">
  import { Volume2 } from '@lucide/svelte';
  import type { Attachment } from 'svelte/attachments';
  import Favicon from './Favicon.svelte';

  interface Props {
    label: string;
    url: string;
    /** Tooltip: the live page title when open. */
    title?: string;
    active?: boolean;
    /** Whether the favorite has an open tab. */
    open?: boolean;
    playing?: boolean;
    onclick: () => void;
    /** Attached to the button (e.g. to make it a drag handle). */
    handle?: Attachment<HTMLElement>;
  }

  let { label, url, title, active = false, open = false, playing = false, onclick, handle }: Props = $props();
</script>

<button
  type="button"
  class={[
    'relative grid h-11 w-full place-items-center rounded-xl transition-[background-color,box-shadow] duration-100',
    active ? 'bg-pill shadow-(--pill-shadow)' : 'bg-tile hover:bg-pill',
  ]}
  aria-label={label}
  aria-current={active ? 'page' : undefined}
  title={title ?? label}
  {onclick}
  {@attach handle}
>
  <span class={['transition-opacity', !open && 'opacity-70']}>
    <Favicon {url} size={20} />
  </span>
  {#if playing}
    <span class="absolute right-1 bottom-1 text-ink-muted" aria-label="Playing audio">
      <Volume2 size={11} strokeWidth={2.25} />
    </span>
  {/if}
</button>
