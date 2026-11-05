/** Compare URLs loosely: ignore the hash and a trailing slash. */
export function sameUrl(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

function normalize(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.href.replace(/\/$/, '');
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
