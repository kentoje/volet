/** Query parameters that only track where a click came from; they don't change the page. */
const TRACKING = /^(utm_|fbclid$|gclid$|mc_eid$|ref_src$)/;

/**
 * Whether two URLs show the same page, loosely: http and https, a leading "www.",
 * a trailing slash, the hash and tracking parameters don't count.
 */
export function sameUrl(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

function normalize(url: string): string {
  try {
    const u = new URL(url);
    const params = [...u.searchParams].filter(([key]) => !TRACKING.test(key));
    const query = params.length ? `?${new URLSearchParams(params)}` : '';
    const host = u.host.replace(/^www\./, '');
    const scheme = u.protocol === 'http:' ? 'https:' : u.protocol;
    return `${scheme}//${host}${u.pathname.replace(/\/$/, '')}${query}`;
  } catch {
    return url;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** A short, readable form of a URL for labels: host and path, without the scheme. */
export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${hostOf(url)}${u.pathname === '/' ? '' : u.pathname}`;
  } catch {
    return url;
  }
}
