<script lang="ts">
  import { AlertDialog } from 'bits-ui';
  import { OVERLAY_ROOT } from './overlay';

  interface Props {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onanswer: (confirmed: boolean) => void;
  }

  let { open, title, description, confirmLabel, onanswer }: Props = $props();
</script>

<AlertDialog.Root {open} onOpenChange={(next) => !next && onanswer(false)}>
  <AlertDialog.Portal to={OVERLAY_ROOT}>
    <AlertDialog.Overlay class="fixed inset-0 z-50 bg-[oklch(0.2_0.03_var(--space-hue)/0.35)]" />
    <AlertDialog.Content
      class="menu-surface fixed top-1/2 left-1/2 z-60 w-[min(300px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 p-4"
    >
      <AlertDialog.Title class="font-display text-[15px] font-bold">{title}</AlertDialog.Title>
      <AlertDialog.Description class="mt-1.5 text-[13px] leading-snug text-ink-muted">
        {description}
      </AlertDialog.Description>
      <div class="mt-4 flex justify-end gap-2">
        <AlertDialog.Cancel class="h-8 rounded-lg px-3 text-[13px] hover:bg-hover" onclick={() => onanswer(false)}>
          Cancel
        </AlertDialog.Cancel>
        <AlertDialog.Action
          class="h-8 rounded-lg bg-(--danger) px-3 text-[13px] font-medium text-white hover:brightness-110"
          onclick={() => onanswer(true)}
        >
          {confirmLabel}
        </AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
