import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ access: vi.fn(), commands: vi.fn() }));
vi.mock('wxt/browser', () => ({ browser: { permissions: { contains: mocks.access }, commands: { getAll: mocks.commands } } }));

import { recentTabsEnabled } from './enabled';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue(true);
  mocks.commands.mockResolvedValue([{ name: 'cycle-recent-tabs-reverse', shortcut: 'Alt+Period' }]);
});

it('requires an assigned shortcut and site access, with no separate enable preference', async () => {
  expect(await recentTabsEnabled()).toBe(true);
  mocks.commands.mockResolvedValue([]);
  expect(await recentTabsEnabled()).toBe(false);
  mocks.commands.mockResolvedValue([{ name: 'cycle-recent-tabs', shortcut: 'Alt+Comma' }]);
  expect(await recentTabsEnabled()).toBe(true);
  mocks.access.mockResolvedValue(false);
  expect(await recentTabsEnabled()).toBe(false);
});
