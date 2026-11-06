<script lang="ts">
  import { ImportState } from '@/lib/state/import.svelte';
  import Card from '../primitives/page/Card.svelte';
  import PageShell from '../primitives/page/PageShell.svelte';
  import ImportChoose from './ImportChoose.svelte';
  import ImportReview from './ImportReview.svelte';
  import { plural } from './plural';

  const importer = new ImportState();
  void importer.start();
  const saved = $derived(importer.saved);
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
    <ImportChoose
      onfile={(file) => void importer.readFile(file)}
      saved={saved ? { spaces: saved.spaces.length, onreview: () => importer.review(saved) } : undefined}
    />
  {:else if importer.step === 'review' && importer.sidebar}
    <ImportReview {importer} sidebar={importer.sidebar} />
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
      </p>
      {#if importer.sidebar && importer.result.spaces < importer.sidebar.spaces.length}
        <p class="mt-2 text-[13px] leading-relaxed text-ink-muted">
          The Arc Spaces you left out stay a click away: the + button at the bottom of the sidebar offers them.
        </p>
      {/if}
    </Card>
  {/if}
</PageShell>
