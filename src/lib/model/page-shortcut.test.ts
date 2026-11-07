import { describe, expect, it } from 'vitest';
import { formatPageShortcut, isPageShortcut, matchesPageShortcut, recordPageShortcut, type PageShortcut } from './page-shortcut';

const commandBackslash: PageShortcut = {
  code: 'Backslash', key: '\\', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false,
};
const event = (overrides: Partial<KeyboardEvent> = {}) => ({
  ...commandBackslash, repeat: false, isComposing: false, getModifierState: () => false, ...overrides,
});

describe('custom page shortcuts', () => {
  it('records and displays Cmd+backslash with and without Shift', () => {
    expect(recordPageShortcut(event())).toEqual(commandBackslash);
    const shifted = recordPageShortcut(event({ shiftKey: true, key: '|' }));
    expect(shifted).toEqual({ ...commandBackslash, shiftKey: true });
    expect(formatPageShortcut(commandBackslash)).toBe('Cmd+\\');
    expect(formatPageShortcut(shifted!)).toBe('Cmd+Shift+\\');
  });

  it.each(['/', ';', "'", '[', ']', '-', '=', '`', ',', '.', '+'])('records punctuation %s without parsing a plus-separated string', (key) => {
    expect(recordPageShortcut(event({ key, code: 'Equal' }))?.key).toBe(key);
  });

  it('matches the physical key despite the shifted character, with exact modifiers', () => {
    const shifted = { ...commandBackslash, shiftKey: true };
    expect(matchesPageShortcut(event({ shiftKey: true, key: '|' }), shifted)).toBe(true);
    expect(matchesPageShortcut(event({ shiftKey: true, key: '|' }), commandBackslash)).toBe(false);
    expect(matchesPageShortcut(event(), shifted)).toBe(false);
    for (const override of [{ ctrlKey: true }, { altKey: true }, { metaKey: false }, { code: 'Slash' }]) {
      expect(matchesPageShortcut(event(override), commandBackslash)).toBe(false);
    }
  });

  it('keeps Ctrl and Alt bindings independent of Cmd', () => {
    expect(formatPageShortcut(recordPageShortcut(event({ metaKey: false, ctrlKey: true }))!)).toBe('Ctrl+\\');
    expect(formatPageShortcut(recordPageShortcut(event({ metaKey: false, altKey: true, shiftKey: true }))!)).toBe('Alt+Shift+\\');
  });

  it.each([
    { metaKey: false }, { metaKey: false, shiftKey: true }, { key: 'Meta' }, { code: '' },
    { key: 'Dead' }, { key: 'Unidentified' }, { repeat: true }, { isComposing: true },
    { getModifierState: () => true },
  ])('does not record typing, modifiers, composition, AltGr or held keys: %o', (override) => {
    expect(recordPageShortcut(event(override))).toBeUndefined();
  });

  it.each([null, undefined, 'Cmd+\\', {}, { ...commandBackslash, shiftKey: 'false' },
    { ...commandBackslash, metaKey: false }, { ...commandBackslash, code: null }])('rejects invalid saved shortcuts: %o', (value) => {
    expect(isPageShortcut(value)).toBe(false);
  });
});
