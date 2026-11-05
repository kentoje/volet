import type { PaletteItem } from './types';

/** Kinds that usually matter more come first when scores tie. */
const KIND_WEIGHT: Record<PaletteItem['kind'], number> = {
  tab: 6,
  pin: 5,
  favorite: 5,
  space: 4,
  action: 3,
  archived: 2,
  'open-url': 0,
  search: 0,
};

/**
 * How well `query` matches `text` (higher is better), or undefined for no match.
 * Every query word must appear; matches at the start of words score higher.
 */
export function score(query: string, text: string): number | undefined {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const haystack = text.toLowerCase();
  let total = 0;
  for (const word of words) {
    const index = haystack.indexOf(word);
    if (index === -1) return undefined;
    const atWordStart = index === 0 || /[\s/._\-:|•·]/.test(haystack[index - 1]!);
    total += word.length * (atWordStart ? 3 : 1) - Math.min(index, 40) / 40;
  }
  return total;
}

/** Filter and order candidates for a query; an empty query keeps the given order. */
export function rank(query: string, candidates: PaletteItem[], limit = 40): PaletteItem[] {
  if (!query.trim()) return candidates.slice(0, limit);
  return candidates
    .map((item) => {
      const titleScore = score(query, item.title);
      const detailScore = score(query, `${item.detail ?? ''} ${item.url ?? ''}`);
      const best = Math.max(titleScore ?? -Infinity, (detailScore ?? -Infinity) * 0.7);
      return { item, value: best === -Infinity ? undefined : best + KIND_WEIGHT[item.kind] * 0.5 };
    })
    .filter((entry): entry is { item: PaletteItem; value: number } => entry.value !== undefined)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((entry) => entry.item);
}

/** Whether typed text is meant as an address rather than a search. */
export function asUrl(text: string): string | undefined {
  const value = text.trim();
  if (!value || /\s/.test(value)) return undefined;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^(about|chrome|data|file):/i.test(value)) return value;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(value) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(value)) {
    return `http://${value}`;
  }
  if (/^[\w-]+(\.[\w-]+)*\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(value)) return `https://${value}`;
  return undefined;
}
