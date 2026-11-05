import { describe, expect, it } from 'vitest';
import { groupColorFor, nextHue } from './colors';
import { uniqueName } from './space-names';

describe('groupColorFor', () => {
  it('picks the nearest Chrome group color, wrapping around the wheel', () => {
    expect(groupColorFor(268)).toBe('blue');
    expect(groupColorFor(152)).toBe('green');
    expect(groupColorFor(42)).toBe('orange');
    expect(groupColorFor(358)).toBe('pink');
    expect(groupColorFor(10)).toBe('red');
  });
});

describe('nextHue', () => {
  it('steps by the golden angle from the last Space', () => {
    expect(nextHue([])).toBe(268);
    expect(nextHue([268])).toBe(46);
  });
});

describe('uniqueName', () => {
  it('keeps free names and numbers taken ones', () => {
    expect(uniqueName('Work', ['Home'])).toBe('Work');
    expect(uniqueName('Work', ['Work', 'Work 2'])).toBe('Work 3');
  });

  it('never reuses the reserved Favorites name', () => {
    expect(uniqueName('Favorites', [])).toBe('Favorites 2');
  });
});
