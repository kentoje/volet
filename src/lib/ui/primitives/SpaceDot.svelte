<script lang="ts">
  import { mergeProps } from 'bits-ui';

  interface Props {
    name: string;
    /** The Space's own hue: each dot previews where it leads. */
    hue: number;
    active?: boolean;
    /** Something is being dragged over it. */
    highlighted?: boolean;
    onclick: () => void;
    /** Extra attributes and handlers (e.g. a tooltip's trigger props). */
    [key: string]: unknown;
  }

  let { name, hue, active = false, highlighted = false, onclick, ...rest }: Props = $props();
</script>

<button
  type="button"
  {...mergeProps(rest, {
    class: [
      'group/dot grid size-7 place-items-center rounded-lg transition-transform hover:bg-hover',
      highlighted && 'scale-125 bg-hover',
    ],
    'aria-label': name,
    'aria-current': active ? ('true' as const) : undefined,
    onclick,
  })}
>
  <!-- Not a pointer target: pointer events (and tooltips) belong to the button. -->
  <span
    class={[
      'pointer-events-none block rounded-full transition-[width,height,box-shadow] duration-200',
      active ? 'size-2.5 shadow-[0_0_0_3px_var(--pill)]' : 'size-[7px] opacity-80 group-hover/dot:opacity-100',
    ]}
    style:background="oklch(var(--dot-l) var(--dot-c) {hue})"
  ></span>
</button>
