import { describe, expect, it } from 'vitest';
import { hasLeading, type MenuIcon, separator } from './menu';

describe('hasLeading', () => {
  const onSelect = () => undefined;
  const Star = (() => ({})) as unknown as MenuIcon;

  it('is true for an item with an icon or a color dot', () => {
    expect(hasLeading({ kind: 'action', label: 'Star', icon: Star, onSelect })).toBe(true);
    expect(hasLeading({ kind: 'action', label: 'Home', hue: 0, onSelect })).toBe(true);
    expect(hasLeading({ kind: 'submenu', label: 'More', icon: Star, items: [] })).toBe(true);
  });

  it('is false for a bare item, a separator or swatches', () => {
    expect(hasLeading({ kind: 'action', label: 'Home', onSelect })).toBe(false);
    expect(hasLeading(separator)).toBe(false);
    expect(hasLeading({ kind: 'swatches', label: 'Color', hues: [0], onSelect })).toBe(false);
  });
});
