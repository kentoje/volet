import { hostOf } from './url';

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
