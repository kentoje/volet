<script lang="ts">
  import Button from '../primitives/page/Button.svelte';
  import Card from '../primitives/page/Card.svelte';
  import FileDrop from '../primitives/page/FileDrop.svelte';

  const ARC_FILE = '~/Library/Application Support/Arc/StorableSidebar.json';

  interface Props {
    onfile: (file: File, handle?: FileSystemFileHandle) => void;
    /** Arc's file was chosen before: offer to read it again, without the file picker. */
    onremembered?: () => void;
  }

  let { onfile, onremembered }: Props = $props();

  let copied = $state(false);

  async function copyPath() {
    await navigator.clipboard.writeText(ARC_FILE);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

{#if onremembered}
  <Card title="Your Arc file">
    <p class="mb-4 text-[14px] leading-relaxed">
      Volet remembers where Arc's sidebar file is. Read it again to see what's in it now.
    </p>
    <Button primary onclick={onremembered}>Use your Arc file</Button>
  </Card>
{/if}

<Card title={onremembered ? 'Or choose the file again' : "Find Arc's sidebar file"}>
  <p class="text-[14px] leading-relaxed">Arc keeps your sidebar in this file on your Mac:</p>
  <div class="my-3 flex items-center gap-2">
    <code class="min-w-0 flex-1 truncate rounded-lg bg-hover px-3 py-2 text-[12px]">{ARC_FILE}</code>
    <Button onclick={() => void copyPath()}>{copied ? 'Copied' : 'Copy path'}</Button>
  </div>
  <p class="mb-4 text-[13px] leading-relaxed text-ink-muted">
    In the file picker, press <kbd>⌘</kbd><kbd>⇧</kbd><kbd>G</kbd>, paste the path, then press Return.
    The file never leaves your computer.
  </p>
  <FileDrop label="Drop StorableSidebar.json here" accept=".json,application/json" {onfile} />
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
