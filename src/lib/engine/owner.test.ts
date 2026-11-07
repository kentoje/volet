import { describe, expect, it } from 'vitest';
import { ownerOf } from './owner';

const github = { id: 'gh', title: 'GitHub', url: 'https://github.com/' };
const news = { id: 'hn', title: 'Hacker News', url: 'https://news.ycombinator.com/' };
const favorites = [github, news];

describe('ownerOf', () => {
  it('finds the bookmark whose own page the tab is on', () => {
    expect(ownerOf(favorites, 'https://news.ycombinator.com/', {}, new Set())).toBe(news);
  });

  it('finds the bookmark whose tab was last on that page, when the tab had left its own', () => {
    const lastPages = { gh: 'https://github.com/pierregoutheraud/volet' };
    expect(ownerOf(favorites, 'https://github.com/pierregoutheraud/volet', lastPages, new Set())).toBe(github);
  });

  it("prefers the bookmark whose own page it is over one whose tab was last there (that can be old)", () => {
    const repo = { id: 'repo', title: 'Repo', url: 'https://github.com/pierregoutheraud/volet' };
    const lastPages = { gh: 'https://github.com/pierregoutheraud/volet' };
    expect(ownerOf([github, repo], 'https://github.com/pierregoutheraud/volet', lastPages, new Set())).toBe(repo);
    // Once the other one has its tab, the remembered page still finds its own.
    expect(ownerOf([github, repo], 'https://github.com/pierregoutheraud/volet', lastPages, new Set(['repo']))).toBe(github);
  });

  it('skips bookmarks another tab already has', () => {
    const lastPages = { gh: 'https://news.ycombinator.com/' };
    expect(ownerOf(favorites, 'https://news.ycombinator.com/', lastPages, new Set(['gh']))).toBe(news);
    expect(ownerOf(favorites, 'https://news.ycombinator.com/', lastPages, new Set(['gh', 'hn']))).toBeUndefined();
  });

  it('finds nothing for a page no bookmark knows', () => {
    expect(ownerOf(favorites, 'https://example.com/', { gh: 'https://github.com/x' }, new Set())).toBeUndefined();
  });
});
