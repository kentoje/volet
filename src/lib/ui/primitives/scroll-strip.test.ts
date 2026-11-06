import { describe, expect, it } from 'vitest';
import { FADE_PX, hiddenEdges, revealOffset } from './scroll-strip';

describe('hiddenEdges', () => {
  it('hides nothing when everything fits', () => {
    expect(hiddenEdges({ scrollLeft: 0, scrollWidth: 200, clientWidth: 200 })).toEqual({ start: false, end: false });
  });

  it('marks the edges that have more items past them', () => {
    expect(hiddenEdges({ scrollLeft: 0, scrollWidth: 400, clientWidth: 200 })).toEqual({ start: false, end: true });
    expect(hiddenEdges({ scrollLeft: 100, scrollWidth: 400, clientWidth: 200 })).toEqual({ start: true, end: true });
    expect(hiddenEdges({ scrollLeft: 200, scrollWidth: 400, clientWidth: 200 })).toEqual({ start: true, end: false });
  });

  it('ignores sub-pixel leftovers', () => {
    expect(hiddenEdges({ scrollLeft: 0.5, scrollWidth: 400, clientWidth: 199.6 })).toEqual({ start: false, end: true });
    expect(hiddenEdges({ scrollLeft: 199.5, scrollWidth: 400, clientWidth: 200 })).toEqual({ start: true, end: false });
  });
});

describe('revealOffset', () => {
  const strip = { left: 100, right: 300 };

  it("doesn't move an item already clear of the fades", () => {
    expect(revealOffset(strip, { left: 150, right: 170 })).toBe(0);
  });

  it('scrolls back to an item before the visible part, past the fade', () => {
    expect(revealOffset(strip, { left: 60, right: 80 })).toBe(60 - 100 - FADE_PX);
  });

  it('scrolls on to an item after the visible part, past the fade', () => {
    expect(revealOffset(strip, { left: 310, right: 330 })).toBe(330 - 300 + FADE_PX);
  });
});
