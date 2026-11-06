<script lang="ts">
  import Button from '../primitives/page/Button.svelte';
  import Card from '../primitives/page/Card.svelte';
  import FileDrop from '../primitives/page/FileDrop.svelte';

  const ARC_FILE = '~/Library/Application Support/Arc/StorableSidebar.json';

  interface Props {
    onfile: (file: File) => void;
    /** What Arc's file held the last time: offer to review it again without choosing the file. */
    saved?: { spaces: number; onreview: () => void };
  }

  let { onfile, saved }: Props = $props();

  let copied = $state(false);

  async function copyPath() {
    await navigator.clipboard.writeText(ARC_FILE);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

{#if saved}
  <Card title="Your Arc Spaces">
    <p class="mb-4 text-[14px] leading-relaxed">
      Volet kept the {saved.spaces === 1 ? 'Space' : `${saved.spaces} Spaces`} from your Arc file. Review them again,
      or choose the file below to read what's in it now.
    </p>
    <Button primary onclick={saved.onreview}>Review your Arc Spaces</Button>
  </Card>
{/if}

<Card title={saved ? 'Or choose the file again' : "Find Arc's sidebar file"}>
  <p class="text-[14px] leading-relaxed">Arc keeps your sidebar in this file, in a hidden folder of your Mac:</p>
  <div class="my-3 flex items-center gap-2">
    <code class="min-w-0 flex-1 truncate rounded-lg bg-hover px-3 py-2 text-[12px]">{ARC_FILE}</code>
    <Button onclick={() => void copyPath()}>{copied ? 'Copied' : 'Copy path'}</Button>
  </div>
  <!-- A page can't open the file picker in a given folder, so the steps get there. -->
  <ol class="mb-4 list-decimal pl-5 text-[13px] leading-relaxed text-ink-muted">
    <li>Copy the path, then click the box below.</li>
    <li>In the file picker, press <kbd>⌘</kbd><kbd>⇧</kbd><kbd>G</kbd>, paste the path, then press Return.</li>
  </ol>
  <FileDrop label="Drop StorableSidebar.json here" accept=".json,application/json" {onfile} />
  <p class="mt-3 text-[12px] text-ink-muted">The file never leaves your computer.</p>
</Card>

<style>
  kbd {
    display: inline-block;
    min-width: 1.4em;
    margin: 0 1px;
    padding: 0 4px;
    border-radius: 4px;
    background: var(--hover);
    font: inherit;
    text-align: center;
  }
</style>
