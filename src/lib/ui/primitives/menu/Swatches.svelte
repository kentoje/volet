<script lang="ts">
  import { ContextMenu } from 'bits-ui';

  interface Props {
    label: string;
    hues: number[];
    selected?: number;
    onSelect: (hue: number) => void;
  }

  let { label, hues, selected, onSelect }: Props = $props();
</script>

<!-- A row of color dots inside a menu; each one is a menu item (arrow keys reach them). -->
<ContextMenu.Group class="px-2 py-1.5" aria-label={label}>
  <div class="mb-1.5 text-[11px] font-medium text-ink-muted">{label}</div>
  <div class="flex gap-1.5">
    {#each hues as hue (hue)}
      <ContextMenu.Item
        class="grid size-6 cursor-default place-items-center rounded-full outline-none data-highlighted:ring-2 data-highlighted:ring-(--focus) [[data-unfocused]_&:hover]:ring-2 [[data-unfocused]_&:hover]:ring-(--focus)"
        aria-label="Hue {hue}"
        onSelect={() => onSelect(hue)}
      >
        <span
          class={['block size-4 rounded-full', hue === selected && 'ring-2 ring-ink ring-offset-1 ring-offset-pill']}
          style:background="oklch(var(--dot-l) var(--dot-c) {hue})"
        ></span>
      </ContextMenu.Item>
    {/each}
  </div>
</ContextMenu.Group>
