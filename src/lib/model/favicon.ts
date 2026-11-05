import { hostOf } from './url';

/**
 * Image sources to try for a page's icon, best first: the icon Chrome shows on the open
 * tab (exact, but only for tabs that are open), then the favicon cache for the address.
 * The tab's icon is skipped when the panel can't load it (chrome:// icons).
 */
export function faviconSources(pageUrl: string, size: number, tabIcon?: string): string[] {
  const usable = tabIcon && /^(https?|data):/i.test(tabIcon) ? [tabIcon] : [];
  return [...usable, faviconSrc(pageUrl, size)];
}

/**
 * Favicon URL for a page. Inside the extension we use Chrome's favicon cache
 * (needs the "favicon" permission); in the prototype page we use Google's service.
 */
export function faviconSrc(pageUrl: string, size: number): string {
  const px = size * 2; // render crisp on high-DPI screens
  const runtime = (globalThis as { chrome?: { runtime?: { id?: string; getURL?: (path: string) => string } } })
    .chrome?.runtime;
  if (runtime?.id && runtime.getURL) {
    return runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${px}`);
  }
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(pageUrl))}&sz=${px}`;
}
