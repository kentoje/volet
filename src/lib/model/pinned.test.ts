import { describe, expect, it } from 'vitest';
import { activePinsIn, hasOpenTab, openPinsIn } from './pinned';
import type { PinnedNode } from './types';

const nodes: PinnedNode[] = [
  { kind: 'pin', id: 'localhost', title: 'localhost', url: 'http://localhost', tabId: 1 },
  { kind: 'pin', id: 'prod', title: 'prod', url: 'https://prod' },
  {
    kind: 'folder',
    id: 'more',
    title: 'More',
    children: [
      { kind: 'pin', id: 'staging', title: 'staging', url: 'https://staging', tabId: 2 },
      { kind: 'pin', id: 'docs', title: 'docs', url: 'https://docs' },
    ],
  },
];

describe('openPinsIn', () => {
  it('lists the pins with an open tab, nested ones included, in order', () => {
    expect(openPinsIn(nodes).map((pin) => pin.id)).toEqual(['localhost', 'staging']);
  });
});

describe('hasOpenTab', () => {
  it('keeps pins with an open tab, and folders holding one at any depth', () => {
    expect(nodes.map(hasOpenTab)).toEqual([true, false, true]);
    expect(hasOpenTab({ kind: 'folder', id: 'f', title: 'F', children: [nodes[1]!] })).toBe(false);
    expect(hasOpenTab({ kind: 'folder', id: 'g', title: 'G', children: [nodes[2]!] })).toBe(true);
  });
});

describe('activePinsIn', () => {
  it('finds the pin showing the active tab, at any depth', () => {
    expect(activePinsIn(nodes, 2).map((pin) => pin.id)).toEqual(['staging']);
    expect(activePinsIn(nodes, 9)).toEqual([]);
    expect(activePinsIn(nodes, undefined)).toEqual([]);
  });
});
