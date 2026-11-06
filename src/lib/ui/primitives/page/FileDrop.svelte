<script lang="ts">
  interface Props {
    label: string;
    /** Like an input's `accept`, e.g. ".json,application/json". */
    accept?: string;
    /** `handle` lets the page read the file again later; browsers without the File System Access API give none. */
    onfile: (file: File, handle?: FileSystemFileHandle) => void;
  }

  let { label, accept, onfile }: Props = $props();

  let over = $state(false);

  type Picker = (options: object) => Promise<FileSystemFileHandle[]>;
  type HandleItem = DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemHandle | null> };

  /** The system picker's file types, from `accept`: its MIME type and extensions. */
  function pickerTypes() {
    const parts = (accept ?? '').split(',').map((part) => part.trim()).filter(Boolean);
    const extensions = parts.filter((part) => part.startsWith('.'));
    const mime = parts.find((part) => part.includes('/')) ?? 'application/octet-stream';
    return extensions.length ? [{ description: label, accept: { [mime]: extensions } }] : undefined;
  }

  /** Where the browser has it, use the system picker instead of the input: it also gives a handle. */
  async function pick(event: MouseEvent) {
    const picker = (window as unknown as { showOpenFilePicker?: Picker }).showOpenFilePicker;
    if (!picker) return;
    event.preventDefault();
    try {
      const [handle] = await picker.call(window, { types: pickerTypes() });
      if (handle) onfile(await handle.getFile(), handle);
    } catch {
      // Cancelled.
    }
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    over = false;
    const file = event.dataTransfer?.files[0];
    if (!file) return;
    // Ask for the handle now: the dropped data is gone once this handler returns.
    const handle = (event.dataTransfer?.items[0] as HandleItem | undefined)?.getAsFileSystemHandle?.();
    if (!handle) return onfile(file);
    handle.then(
      (found) => onfile(file, found?.kind === 'file' ? (found as FileSystemFileHandle) : undefined),
      () => onfile(file),
    );
  }
</script>

<!-- Drop a file here, or click (or press Space) to choose one. The label opens the file input. -->
<label
  class={[
    'flex w-full cursor-default flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:border-(--focus)',
    over ? 'border-(--focus) bg-hover' : 'border-rule hover:bg-hover',
  ]}
  ondragover={(event) => {
    event.preventDefault();
    over = true;
  }}
  ondragleave={() => (over = false)}
  ondrop={drop}
>
  <span class="text-[14px] font-medium">{label}</span>
  <span class="text-[12px] text-ink-muted">or click to choose it</span>
  <input
    class="sr-only"
    type="file"
    {accept}
    onclick={(event) => void pick(event)}
    onchange={(event) => {
      const file = event.currentTarget.files?.[0];
      if (file) onfile(file);
      event.currentTarget.value = '';
    }}
  />
</label>
