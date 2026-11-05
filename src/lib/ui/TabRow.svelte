<script lang="ts">
  import type { Snippet } from 'svelte';
  import Favicon from './Favicon.svelte';

  interface Props {
    title: string;
    url: string;
    active?: boolean;
    /** A pin whose tab is closed: shown dimmed, clicking reopens it. */
    unloaded?: boolean;
    loading?: boolean;
    depth?: number;
    /** Muted text shown before the title (e.g. the "/" of a pin navigated away). */
    prefix?: string;
    onactivate: () => void;
    /** Buttons drawn over the favicon, shown on hover. */
    leading?: Snippet;
    /** Buttons on the right edge. */
    trailing?: Snippet;
  }

  let {
    title,
    url,
    active = false,
    unloaded = false,
    loading = false,
    depth = 0,
    prefix,
    onactivate,
    leading,
    trailing,
  }: Props = $props();
</script>

<div
  class={[
    'group/row relative rounded-[10px] transition-[background-color,box-shadow] duration-100',
    active ? 'bg-pill shadow-(--pill-shadow)' : 'hover:bg-hover',
  ]}
  style:--depth={depth}
>
  <button
    type="button"
    class={[
      'flex h-[34px] w-full items-center gap-2.5 rounded-[inherit] pr-10 pl-[calc(10px+var(--depth)*16px)] text-left text-[13px]',
      active && 'font-medium',
      unloaded && 'text-ink-muted',
    ]}
    title={title}
    aria-current={active ? 'page' : undefined}
    onclick={onactivate}
  >
    <span class={['grid size-4 flex-none place-items-center', unloaded && 'opacity-50 saturate-50']}>
      {#if loading}
        <span
          class="size-[13px] animate-spin rounded-full border-[1.5px] border-rule border-t-ink-muted motion-reduce:[animation-duration:2s]"
          role="status"
          aria-label="Loading"
        ></span>
      {:else}
        <Favicon {url} />
      {/if}
    </span>
    <span class="truncate">
      {#if prefix}<span class="mr-1.5 font-normal text-ink-muted">{prefix}</span>{/if}{title}
    </span>
  </button>

  {#if leading}
    <div
      class="absolute top-1/2 left-[calc(6px+var(--depth)*16px)] -translate-y-1/2 opacity-0 transition-opacity duration-100 group-focus-within/row:opacity-100 group-hover/row:opacity-100"
    >
      {@render leading()}
    </div>
  {/if}
  {#if trailing}
    <div class="absolute top-1/2 right-1.5 flex -translate-y-1/2 gap-0.5">
      {@render trailing()}
    </div>
  {/if}
</div>
