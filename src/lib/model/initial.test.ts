import { describe, expect, it } from 'vitest';
import { spaceInitial } from './initial';

describe('spaceInitial', () => {
  it("is the name's first letter, uppercased", () => {
    expect(spaceInitial('Work')).toBe('W');
    expect(spaceInitial('perso')).toBe('P');
  });

  it('skips leading spaces', () => {
    expect(spaceInitial('  side project')).toBe('S');
  });

  it('keeps an emoji or an accented letter whole', () => {
    expect(spaceInitial('🚀 Launch')).toBe('🚀');
    expect(spaceInitial('👩‍💻 Code')).toBe('👩‍💻');
    expect(spaceInitial('élan')).toBe('É');
  });

  it('is empty for a blank name', () => {
    expect(spaceInitial('')).toBe('');
    expect(spaceInitial('   ')).toBe('');
  });
});
