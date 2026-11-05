<script lang="ts">
  import { Search } from '@lucide/svelte';
  import type { PaletteItem } from '@/lib/model/palette';
  import PaletteRow from './PaletteRow.svelte';

  interface Props {
    query: string;
    items: PaletteItem[];
    selected: number;
    oninput: (text: string) => void;
    onmove: (delta: number) => void;
    onpick: (index: number) => void;
    onhover: (index: number) => void;
    onclose: () => void;
  }

  let { query, items, selected, oninput, onmove, onpick, onhover, onclose }: Props = $props();

  const listId = 'palette-results';
  const optionId = (index: number) => `palette-option-${index}`;

  const keys: Record<string, () => void> = {
    ArrowDown: () => onmove(1),
    ArrowUp: () => onmove(-1),
    Enter: () => onpick(selected),
    Escape: () => onclose(),
  };

  const focusOnMount = (input: HTMLInputElement) => input.focus();

  /** Keep the selected option in view as the arrow keys move (re-runs when `selected` changes). */
  const scrollIntoView = (list: HTMLElement) => {
    list.querySelector(`#${optionId(selected)}`)?.scrollIntoView({ block: 'nearest' });
  };
</script>

<div class="flex max-h-[min(460px,70vh)] flex-col">
  <label class="flex h-12 flex-none items-center gap-3 border-b border-rule px-4">
    <Search size={16} strokeWidth={2} class="flex-none text-ink-muted" />
    <input
      class="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
      placeholder="Search tabs, pins, or type a URL"
      role="combobox"
      aria-expanded={items.length > 0}
      aria-controls={listId}
      aria-activedescendant={items.length ? optionId(selected) : undefined}
      aria-autocomplete="list"
      autocomplete="off"
      spellcheck="false"
      value={query}
      oninput={(event) => oninput(event.currentTarget.value)}
      onkeydown={(event) => {
        const action = keys[event.key] ?? (event.ctrlKey && { n: keys.ArrowDown, p: keys.ArrowUp }[event.key]);
        if (!action) return;
        event.preventDefault();
        action();
      }}
      {@attach focusOnMount}
    />
  </label>
  <div id={listId} role="listbox" aria-label="Results" class="min-h-0 flex-1 overflow-y-auto p-1.5" {@attach scrollIntoView}>
    {#each items as item, index (item.id)}
      <PaletteRow
        {item}
        id={optionId(index)}
        selected={index === selected}
        onpick={() => onpick(index)}
        onhover={() => onhover(index)}
      />
    {:else}
      <p class="px-3 py-6 text-center text-[13px] text-ink-muted">No matches. Press Enter to search the web.</p>
    {/each}
  </div>
</div>
