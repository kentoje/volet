<script lang="ts">
  import { colorScheme } from '../primitives/color-scheme';
  import RecentTabCard from './RecentTabCard.svelte';
  import type { RecentTabsState } from './recent-tabs-state.svelte';

  let { state, onchoose, oncancel, scheme }: {
    state: RecentTabsState;
    onchoose: (index: number) => void;
    oncancel: () => void;
    /** Forces a color scheme; otherwise the system's. */
    scheme?: 'light' | 'dark';
  } = $props();
</script>

{#if state.view}
  <!-- Tinted like the side panel and Search: the window's active Volet's hue, in the system's color scheme. -->
  <div class="recent-tabs-root" data-scheme={colorScheme(scheme)} style:--space-hue={state.hue}>
    <button class="recent-tabs-backdrop" aria-label="Cancel tab switching" onclick={oncancel}></button>
    <!-- Not modal: a glance while the shortcut is held, the page keeps its focus. -->
    <div class="recent-tabs-dialog" role="dialog" aria-label="Recent tabs" tabindex="-1">
      <div class="recent-tabs-list">
        {#each state.view.tabs as tab, index (tab.id)}
          <RecentTabCard
            {tab}
            selected={index === state.view.selected}
            onhighlight={() => state.cycle.select(index)}
            onchoose={() => onchoose(index)}
            onclose={() => { state.cycle.select(index); state.cycle.closeSelected(); }}
          />
        {/each}
      </div>
      <span class="recent-tabs-announcement" aria-live="polite">{state.view.tabs[state.view.selected]?.title}</span>
    </div>
  </div>
{/if}
