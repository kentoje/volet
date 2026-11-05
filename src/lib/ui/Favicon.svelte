<script lang="ts">
  import { Globe } from '@lucide/svelte';
  import { faviconSrc } from '@/lib/model/favicon';
  import { hostOf } from '@/lib/model/url';

  interface Props {
    url: string;
    size?: number;
  }

  let { url, size = 16 }: Props = $props();

  const src = $derived(faviconSrc(url, size));
  /** Browser pages (new tab, settings) have no site favicon. */
  const internal = $derived(/^(chrome|about|edge|brave):/.test(url));
  let failedSrc = $state<string>();
</script>

{#if internal}
  <span class="grid flex-none place-items-center text-ink-muted" style:width="{size}px" style:height="{size}px">
    <Globe size={size - 1} strokeWidth={1.75} />
  </span>
{:else if failedSrc === src}
  <span
    class="grid flex-none place-items-center rounded-[4px] bg-rule leading-none font-semibold text-ink-muted"
    style:width="{size}px"
    style:height="{size}px"
    style:font-size="{size * 0.62}px"
    aria-hidden="true"
  >
    {hostOf(url).charAt(0).toUpperCase()}
  </span>
{:else}
  <img
    class="block flex-none rounded-[3px]"
    {src}
    alt=""
    width={size}
    height={size}
    draggable="false"
    onerror={() => (failedSrc = src)}
  />
{/if}
