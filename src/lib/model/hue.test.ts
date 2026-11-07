import { describe, expect, it } from 'vitest';
import { blendHue, hueGradient, nearestHue } from './hue';

describe('nearestHue', () => {
  it('takes the short way around the wheel', () => {
    expect(nearestHue(350, 10)).toBe(370);
    expect(nearestHue(10, 350)).toBe(-10);
  });
});

describe('blendHue', () => {
  it('blends the short way and clamps the amount', () => {
    expect(blendHue(350, 10, 0.5)).toBe(360);
    expect(blendHue(0, 100, 2)).toBe(100);
  });
});

describe('hueGradient', () => {
  it('goes around the whole wheel in the theme colors', () => {
    const gradient = hueGradient(90);
    expect(gradient).toBe(
      'linear-gradient(to right, ' +
        ['0', '90', '180', '270', '360'].map((hue) => `oklch(var(--dot-l) var(--dot-c) ${hue})`).join(', ') +
        ')',
    );
  });

  it('defaults to a stop every 30 degrees', () => {
    expect(hueGradient().match(/oklch/g)).toHaveLength(13);
  });
});
