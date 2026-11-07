<script lang="ts">
  import type { ArcClient } from '@/lib/model/arc';
  import type { PaletteClient } from '@/lib/model/palette';
  import type { SidebarStore } from '@/lib/model/types';
  import Sidebar from '@/lib/ui/sidebar/Sidebar.svelte';
  import logo from '../design/logo/fold/logo.svg?url';

  /**
   * The Chrome Web Store images (`store/capture.mjs` renders this page): the real sidebar on fake data,
   * docked on the right like Chrome's side panel, next to a headline. `promo` and `marquee` are the
   * listing's promo tiles.
   */
  interface Props {
    store: SidebarStore;
    palette: PaletteClient;
    arc: ArcClient;
    shot: 'screenshot' | 'promo' | 'marquee';
    headline: string;
    detail: string;
    scheme?: 'light' | 'dark';
  }

  let { store, palette, arc, shot, headline, detail, scheme }: Props = $props();

  const hue = $derived(store.spaces.find((space) => space.id === store.activeSpaceId)?.hue ?? 268);
</script>

{#snippet wordmark(size: number)}
  <div class="flex items-center" style:gap="{size * 0.3}px">
    <img src={logo} alt="" width={size} height={size} />
    <span class="font-semibold tracking-tight" style:font-size="{size * 0.78}px">Volet</span>
  </div>
{/snippet}

{#if shot === 'screenshot'}
  <main class="frame screenshot" style:--frame-hue={hue} data-scheme={scheme ?? 'light'}>
    <section class="flex flex-1 flex-col justify-center gap-5 px-16">
      {@render wordmark(30)}
      <h1 class="text-[46px] leading-[1.05] font-semibold tracking-tight text-balance">{headline}</h1>
      <p class="max-w-[440px] text-[19px] leading-snug text-pretty opacity-75">{detail}</p>
    </section>
    <aside class="panel">
      <Sidebar {store} {palette} {arc} {scheme} />
    </aside>
  </main>
{:else}
  <main class="frame brand {shot}">
    <section class={['flex flex-col justify-center gap-4', { 'items-center': shot === 'promo' }]}>
      {@render wordmark(shot === 'promo' ? 64 : 84)}
      <p class={['tagline text-pretty', { 'text-center': shot === 'promo' }]}>{detail}</p>
    </section>
    {#if shot === 'marquee'}
      <aside class="panel">
        <Sidebar {store} {palette} {arc} scheme="light" />
      </aside>
    {/if}
  </main>
{/if}

<style>
  .frame {
    display: flex;
    overflow: hidden;
    font-family: 'Gabarito Variable', sans-serif;
  }

  .screenshot {
    width: 1024px;
    height: 640px;
    color: oklch(0.27 0.035 var(--frame-hue));
    background: linear-gradient(160deg, oklch(0.975 0.018 var(--frame-hue)), oklch(0.93 0.04 var(--frame-hue)));
  }

  .screenshot[data-scheme='dark'] {
    color: oklch(0.95 0.015 var(--frame-hue));
    background: linear-gradient(160deg, oklch(0.27 0.03 var(--frame-hue)), oklch(0.19 0.02 var(--frame-hue)));
  }

  /* Chrome's side panel: full height on the right, a hairline on its left edge. */
  .screenshot .panel {
    width: 336px;
    height: 100%;
    flex-shrink: 0;
    box-shadow: -1px 0 0 oklch(0.3 0.04 var(--frame-hue) / 0.18), -18px 0 48px oklch(0.3 0.06 var(--frame-hue) / 0.12);
  }

  .brand {
    color: oklch(0.97 0.01 40);
    background:
      radial-gradient(circle at 18% 30%, oklch(0.62 0.17 35 / 0.35), transparent 60%),
      oklch(0.2 0.012 300);
  }

  .promo {
    width: 440px;
    height: 280px;
    justify-content: center;
    padding: 0 32px;
  }

  .marquee {
    width: 1400px;
    height: 560px;
    justify-content: space-between;
    padding-left: 120px;
  }

  .tagline {
    max-width: 520px;
    font-size: 30px;
    line-height: 1.2;
    color: oklch(0.85 0.02 40);
  }

  .promo .tagline {
    font-size: 21px;
  }

  /* The marquee shows the panel's top, bleeding off the bottom edge. */
  .marquee .panel {
    width: 336px;
    height: 640px;
    margin: 64px 140px 0 0;
    border-radius: 14px 14px 0 0;
    overflow: hidden;
    box-shadow: 0 30px 80px oklch(0 0 0 / 0.45);
  }
</style>
