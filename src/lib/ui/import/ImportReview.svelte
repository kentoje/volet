<script lang="ts">
  import { countPins } from '@/lib/import/types';
  import { MAX_SPACES } from '@/lib/model/spaces';
  import type { ImportState } from '@/lib/state/import.svelte';
  import Button from '../primitives/page/Button.svelte';
  import Card from '../primitives/page/Card.svelte';
  import Choice from '../primitives/page/Choice.svelte';

  let { importer }: { importer: ImportState } = $props();

  const sidebar = $derived(importer.sidebar!);
  const count = $derived(importer.chosen.size);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<Card title="Choose what to import">
  <div class="flex flex-col gap-0.5">
    {#each sidebar.spaces as space, index (index)}
      <Choice
        label={space.name}
        detail={plural(countPins(space.pinned), 'pin')}
        hue={space.hue}
        checked={importer.chosen.has(index)}
        disabled={!importer.chosen.has(index) && importer.full}
        ontoggle={() => importer.toggle(index)}
      />
    {/each}
    {#if sidebar.favorites.length}
      <div class="my-1 h-px bg-rule"></div>
      <Choice
        label="Favorites"
        detail={plural(sidebar.favorites.length, 'site')}
        checked={importer.includeFavorites}
        ontoggle={() => (importer.includeFavorites = !importer.includeFavorites)}
      />
    {/if}
  </div>
  <p class="mt-4 text-[13px] leading-relaxed text-ink-muted">
    Each Arc Space becomes a Volet next to your current ones. Arc's unpinned tabs aren't imported.
    {#if importer.room === 0}
      There's no room for more Volets (you can have up to {MAX_SPACES}): delete some to make room. Favorites can still be imported.
    {:else if importer.room < sidebar.spaces.length}
      You can have up to {MAX_SPACES} Volets, so {importer.room === 1 ? 'one more fits' : `${importer.room} more fit`}.
    {/if}
  </p>
  <div class="mt-4 flex justify-end gap-2">
    <Button onclick={() => importer.restart()}>Choose another file</Button>
    <Button primary disabled={count === 0 && !importer.includeFavorites} onclick={() => void importer.run()}>
      {count ? `Import ${plural(count, 'Volet')}` : 'Import favorites'}
    </Button>
  </div>
</Card>
