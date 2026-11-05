<script lang="ts">
  import type { Snippet } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';

  interface Props {
    title: string;
    intro?: string;
    children: Snippet;
  }

  let { title, intro, children }: Props = $props();

  const prefersDark = new MediaQuery('(prefers-color-scheme: dark)');
</script>

<!-- A full-page layout for the extension's own pages, in the sidebar's tint. -->
<div class="page-root text-ink" data-scheme={prefersDark.current ? 'dark' : 'light'}>
  <main class="mx-auto flex max-w-[640px] flex-col gap-5 px-4 py-12">
    <header>
      <h1 class="font-display text-[28px] leading-tight font-bold">{title}</h1>
      {#if intro}<p class="mt-2 text-[14px] leading-relaxed text-ink-muted">{intro}</p>{/if}
    </header>
    {@render children()}
  </main>
</div>
