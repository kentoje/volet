import { describe, expect, it } from 'vitest';
import { revealDelta } from './reveal-row';

describe('revealDelta', () => {
  const view = { top: 100, bottom: 500 };

  it("doesn't move a row that shows fully", () => {
    expect(revealDelta(view, { top: 100, bottom: 134 })).toBe(0);
    expect(revealDelta(view, { top: 466, bottom: 500 })).toBe(0);
  });

  it('scrolls down to a row below the visible part, leaving some room', () => {
    expect(revealDelta(view, { top: 700, bottom: 734 }, 8)).toBe(734 - 500 + 8);
    expect(revealDelta(view, { top: 480, bottom: 514 }, 8)).toBe(514 - 500 + 8); // half hidden
  });

  it('scrolls up to a row above the visible part, leaving some room', () => {
    expect(revealDelta(view, { top: 20, bottom: 54 }, 8)).toBe(20 - 100 - 8);
  });
});
