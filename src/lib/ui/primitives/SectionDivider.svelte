<script lang="ts">
  interface Action {
    label: string;
    /** Longer description, shown as a tooltip. */
    description: string;
    onclick: () => void;
  }

  /** `action` shows as a small button on hover, like Arc's "Clear". */
  let { action }: { action?: Action } = $props();
</script>

<div class="group/divider relative my-2 flex h-5 items-center px-2.5">
  <span class="h-px flex-1 bg-rule"></span>
  {#if action}
    <button
      type="button"
      class="absolute right-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-ink-muted opacity-0 transition-opacity duration-100 group-hover/divider:opacity-100 hover:bg-hover hover:text-ink focus-visible:opacity-100"
      title={action.description}
      onclick={action.onclick}
    >
      {action.label}
    </button>
  {/if}
</div>
