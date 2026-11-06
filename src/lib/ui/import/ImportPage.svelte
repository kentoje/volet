<script lang="ts">
  import { MAX_SPACES } from '@/lib/model/spaces';
  import { ImportState } from '@/lib/state/import.svelte';
  import Card from '../primitives/page/Card.svelte';
  import PageShell from '../primitives/page/PageShell.svelte';
  import ImportChoose from './ImportChoose.svelte';
  import ImportReview from './ImportReview.svelte';

  const importer = new ImportState();
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<PageShell
  title="Import from Arc"
  intro="Bring your Arc Spaces, pinned tabs, folders and favorites into the sidebar."
>
  {#if importer.error}
    <p role="alert" class="rounded-xl bg-[oklch(0.6_0.18_25/0.14)] px-4 py-3 text-[13px] text-(--danger)">
      {importer.error}
    </p>
  {/if}

  {#if importer.step === 'choose'}
    <ImportChoose onfile={(file) => void importer.readFile(file)} />
  {:else if importer.step === 'review'}
    <ImportReview {importer} />
  {:else if importer.step === 'importing'}
    <Card>
      <p class="text-[14px]" role="status">Importing… this takes a few seconds for large sidebars.</p>
    </Card>
  {:else if importer.result}
    <Card title="Done">
      <p class="text-[14px] leading-relaxed" role="status">
        Imported {plural(importer.result.spaces, 'Volet')} with {plural(importer.result.pins, 'pin')}{importer.result
          .favorites
          ? `, and ${plural(importer.result.favorites, 'favorite')}`
          : ''}. Open the sidebar to see them.
        {#if importer.result.skipped}
          {plural(importer.result.skipped, 'Arc Space')} didn't fit: you can have up to {MAX_SPACES} Volets.
        {/if}
      </p>
    </Card>
  {/if}
</PageShell>
