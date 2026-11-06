import { describe, expect, it, vi } from 'vitest';

vi.mock('wxt/utils/storage', () => ({ storage: { defineItem: (key: string) => ({ key }) } }));
vi.mock('wxt/browser', () => ({ browser: {} }));

const { changesSnapshot } = await import('./load-snapshot');

describe('changesSnapshot', () => {
  it('is true only for the storage items a snapshot reads', () => {
    expect(changesSnapshot({ bindings: {} }, 'session')).toBe(true);
    expect(changesSnapshot({ openFolders: {} }, 'local')).toBe(true);
    expect(changesSnapshot({ spaceMeta: {} }, 'sync')).toBe(true);
    expect(changesSnapshot({ tabActivity: {}, lastActive: {} }, 'session')).toBe(false);
    expect(changesSnapshot({ archive: {} }, 'local')).toBe(false);
    // Same name, other area.
    expect(changesSnapshot({ bindings: {} }, 'local')).toBe(false);
  });
});
