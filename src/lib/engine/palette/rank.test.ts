import { describe, expect, it } from 'vitest';
import { asUrl, rank, score } from './rank';
import type { PaletteItem } from './types';

const item = (id: string, kind: PaletteItem['kind'], title: string, url?: string): PaletteItem => ({ id, kind, title, url });

describe('score', () => {
  it('needs every word and prefers word starts', () => {
    expect(score('svel docs', 'Svelte Docs')).toBeGreaterThan(0);
    expect(score('svelte react', 'Svelte Docs')).toBeUndefined();
    expect(score('doc', 'Docs')!).toBeGreaterThan(score('ocs', 'Docs')!);
  });
});

describe('rank', () => {
  const candidates = [
    item('1', 'archived', 'GitHub pull request', 'https://github.com/acme/pull/1'),
    item('2', 'tab', 'Pull requests', 'https://github.com/pulls'),
    item('3', 'pin', 'Linear', 'https://linear.app'),
  ];

  it('filters to matches and puts the best first', () => {
    expect(rank('pull', candidates).map((c) => c.id)).toEqual(['2', '1']);
  });

  it('matches on the address too', () => {
    expect(rank('linear.app', candidates).map((c) => c.id)).toEqual(['3']);
  });

  it('keeps the given order for an empty query', () => {
    expect(rank('', candidates).map((c) => c.id)).toEqual(['1', '2', '3']);
  });
});

describe('asUrl', () => {
  it('recognizes addresses and leaves searches alone', () => {
    expect(asUrl('svelte.dev/docs')).toBe('https://svelte.dev/docs');
    expect(asUrl('localhost:5173')).toBe('http://localhost:5173');
    expect(asUrl('https://example.com')).toBe('https://example.com');
    expect(asUrl('chrome://extensions')).toBe('chrome://extensions');
    expect(asUrl('how to center a div')).toBeUndefined();
    expect(asUrl('svelte')).toBeUndefined();
  });
});
