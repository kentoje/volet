<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import Favicon from './Favicon.svelte';
  import { revealRow } from './reveal-row';
  import TooltipGroup from './tooltip/TooltipGroup.svelte';

  interface Props {
    title: string;
    url: string;
    /** The icon Chrome shows on the open tab, if any. */
    icon?: string;
    active?: boolean;
    /** Part of a multi-row selection. */
    selected?: boolean;
    /** A pin with its tab open: a faint dot at the row's end (closed ones look the same, without it). */
    openMark?: boolean;
    loading?: boolean;
    depth?: number;
    /** Muted text shown before the title (e.g. the "/" of a pin navigated away). */
    prefix?: string;
    /** A click on the row (the event tells whether a modifier key was held). */
    onactivate: (event: MouseEvent) => void;
    ondblclick?: () => void;
    /** A button that takes the favicon's place on hover (the favicon fades out). */
    leading?: Snippet;
    /** Buttons on the right edge. */
    trailing?: Snippet;
    /** How many trailing buttons are always shown, and how many on hover; the title makes room. */
    buttons?: { shown: number; onHover: number };
    /** Attached to the main button (e.g. to make it a drag handle). */
    handle?: Attachment<HTMLElement>;
    /** Replaces the title with an editor (e.g. a rename field); the row stops being a button meanwhile. */
    editor?: Snippet;
  }

  let {
    title,
    url,
    icon,
    active = false,
    selected = false,
    openMark = false,
    loading = false,
    depth = 0,
    prefix,
    onactivate,
    ondblclick,
    leading,
    trailing,
    handle,
    editor,
    buttons = { shown: 0, onHover: 1 },
  }: Props = $props();

  /** Hidden while the row is hovered or focused (a button takes its place then). */
  const HIDE_ON_HOVER =
    'group-focus-within/row:opacity-0 group-hover/row:opacity-0 group-data-hovered/row:opacity-0';

  /** Each trailing button takes 24px (they touch, see below), after a 10px margin. */
  const room = (count: number, extra = 0) => `${10 + count * 24 + extra}px`;
  /** The open dot sits just left of the always-shown buttons; the title stops before it. */
  const DOT_ROOM = 14;
  const dotRight = $derived(`${12 + buttons.shown * 24}px`);

  const mainClass = $derived([
    'flex h-[34px] w-full items-center gap-2.5 rounded-[inherit] pr-(--room) pl-[calc(10px+var(--depth)*16px)] text-left text-[13px] group-focus-within/row:pr-(--room-hover) group-hover/row:pr-(--room-hover) group-data-hovered/row:pr-(--room-hover)',
    active && 'font-medium',
  ]);
</script>

{#snippet favicon()}
  <span
    class={[
      'grid size-4 flex-none place-items-center transition-opacity duration-100',
      leading && !editor && HIDE_ON_HOVER,
    ]}
  >
    {#if loading}
      <span
        class="size-[13px] animate-spin rounded-full border-[1.5px] border-rule border-t-ink-muted motion-reduce:[animation-duration:2s]"
        role="status"
        aria-label="Loading"
      ></span>
    {:else}
      <Favicon {url} {icon} />
    {/if}
  </span>
{/snippet}

<!--
  `data-row` marks the row's root (a drag copies it). A copy sets `data-hovered` to keep the hover
  look it had under the pointer: the same rules as hover apply to it.
  The active row keeps itself in view: when it becomes active, or appears active (a new tab).
-->
<div
  class={[
    'group/row relative rounded-[10px] transition-[background-color,box-shadow] duration-100',
    selected
      ? 'bg-selected'
      : active
        ? 'bg-pill shadow-(--pill-shadow)'
        : 'hover:bg-hover data-hovered:bg-hover',
  ]}
  data-selected={selected || undefined}
  data-open={openMark || undefined}
  data-row
  style:--depth={depth}
  style:--room={room(buttons.shown, openMark ? DOT_ROOM : 0)}
  style:--room-hover={room(buttons.onHover)}
  {@attach active && revealRow}
>
  {#if editor}
    <div class={mainClass}>
      {@render favicon()}
      {@render editor()}
    </div>
  {:else}
    <button
      type="button"
      class={mainClass}
      {title}
      aria-current={active ? 'page' : undefined}
      onclick={onactivate}
      {ondblclick}
      {@attach handle}
    >
      {@render favicon()}
      <span class="truncate">
        {#if prefix}<span class="mr-1.5 font-normal text-ink-muted">{prefix}</span>{/if}{title}
      </span>
    </button>
  {/if}

  {#if openMark && !editor}
    <!-- Open, like a running app's dot in the macOS Dock: faint, at the row's end. -->
    <span
      class={[
        'pointer-events-none absolute top-[calc(50%-3px)] size-1.5 rounded-full bg-ink-muted/40 transition-opacity duration-100',
        trailing && buttons.onHover > buttons.shown && HIDE_ON_HOVER,
      ]}
      style:right={dotRight}
    ></span>
  {/if}

  <!-- The row's buttons share one tooltip. Trailing buttons touch, so it moves from one to the
       next without closing in between. -->
  <TooltipGroup>
    {#if leading && !editor}
      <div
        class="absolute top-1/2 left-[calc(6px+var(--depth)*16px)] -translate-y-1/2 opacity-0 transition-opacity duration-100 group-focus-within/row:opacity-100 group-hover/row:opacity-100 group-data-hovered/row:opacity-100"
      >
        {@render leading()}
      </div>
    {/if}
    {#if trailing && !editor}
      <div class="absolute top-1/2 right-1.5 flex -translate-y-1/2">
        {@render trailing()}
      </div>
    {/if}
  </TooltipGroup>
</div>
