<script lang="ts">
  import ConfirmDialog from '../../primitives/ConfirmDialog.svelte';
  import { getConfirm } from './context';

  const confirm = getConfirm();
</script>

{#if confirm.request}
  <ConfirmDialog
    open
    title={confirm.request.title}
    description={confirm.request.description}
    confirmLabel={confirm.request.confirmLabel}
    onanswer={(confirmed) => confirm.answer(confirmed)}
  />
{/if}
