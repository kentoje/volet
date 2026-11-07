<script lang="ts">
  import { mergeProps } from 'bits-ui';
  import type { Attachment } from 'svelte/attachments';

  /**
   * A Space in the switcher, drawn as a shutter (a volet): closed, a small panel in the Space's color with its
   * initial; open (the active Space), it unfolds into a pill showing the Space's name.
   */
  interface Props {
    name: string;
    /** Shown on the closed shutter, so Spaces of similar hues are told apart at a glance. */
    initial: string;
    /** The Space's own hue: each shutter previews where it leads. */
    hue: number;
    active?: boolean;
    /** Shows the name. The active Space's shutter is open, unless the switcher holds another one open. */
    open?: boolean;
    /** Something is being dragged over it. */
    highlighted?: boolean;
    onclick: () => void;
    /** Attached to the button (e.g. to make it a drag handle). */
    handle?: Attachment<HTMLElement>;
    /** Extra attributes and handlers (e.g. a tooltip's trigger props). */
    [key: string]: unknown;
  }

  let {
    name,
    initial,
    hue,
    active = false,
    open = active,
    highlighted = false,
    onclick,
    handle,
    ...rest
  }: Props = $props();
</script>

<button
  type="button"
  {...mergeProps(rest, {
    class: [
      // As wide as its slot (the switcher narrows the slots when there are many Spaces), or the open shutter.
      'group/dot grid h-7 w-full place-items-center rounded-lg px-0.5 transition-transform hover:bg-hover data-hovered:bg-hover',
      highlighted && 'scale-110 bg-hover',
    ],
    'aria-label': name,
    'aria-current': active ? ('true' as const) : undefined,
    // Every shutter holds its name (hidden while closed): this tells the open one apart.
    'data-open': open ? '' : undefined,
    onclick,
  })}
  {@attach handle}
>
  <!-- Not a pointer target: pointer events (and tooltips) belong to the button.
       The button's label already names the Space, so its text is hidden from screen readers.
       Opening and closing animate the width (to and from `auto`, hence interpolate-size), and the
       panel clips its content, so the name is revealed as the shutter unfolds and hidden as it folds. -->
  <span
    aria-hidden="true"
    class={[
      'pointer-events-none relative flex h-[22px] items-center justify-center overflow-hidden rounded-[5px] text-[11px] leading-none text-(--dot-ink) transition-[width,padding,opacity,box-shadow] duration-200 select-none [interpolate-size:allow-keywords] motion-reduce:transition-none',
      open ? 'w-auto max-w-[88px] px-2' : 'w-4',
      // The active Space's shutter wears a ring, so it reads as the selected one at a glance.
      active ? 'shadow-[0_0_0_2px_var(--dot-ring)]' : !open && 'opacity-80 group-hover/dot:opacity-100',
    ]}
    style:background="oklch(var(--dot-l) var(--dot-c) {hue})"
  >
    <!-- Both texts are always there, crossfading: the name alone sizes the open shutter, so closing
         starts from its width (swapping it for the initial would snap the width to the letter's first).
         The name fades out first as the shutter folds and in a beat after it starts unfolding; the
         initial comes back once the shutter is nearly shut.
         Both are trimmed to the capital's height (cap line to baseline), so the text itself is centered,
         not the font's line box, which leaves room for descenders and sits capitals low. -->
    <!-- The name keeps its full width (flex-none: the panel clips it from the middle out, with no
         ellipsis mid-animation); only a name longer than the open shutter (88px less its padding)
         ends in one. It clips sideways only (overflow-x), so its descenders still show below the trim. -->
    <span
      class={[
        'max-w-[72px] flex-none overflow-x-clip font-semibold text-ellipsis whitespace-nowrap transition-opacity [text-box:trim-both_cap_alphabetic] motion-reduce:transition-none',
        open ? 'opacity-100 delay-50 duration-150' : 'opacity-0 duration-100',
      ]}
    >
      {name}
    </span>
    <!-- Laid over the panel, so it takes no room. -->
    <span
      class={[
        'absolute inset-0 grid place-items-center font-bold transition-opacity motion-reduce:transition-none',
        open ? 'opacity-0 duration-100' : 'opacity-100 delay-100 duration-100',
      ]}
    >
      <span class="block [text-box:trim-both_cap_alphabetic]">{initial}</span>
    </span>
  </span>
</button>
