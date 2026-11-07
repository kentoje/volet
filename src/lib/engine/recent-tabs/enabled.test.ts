import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ preference: vi.fn(), access: vi.fn(), commands: vi.fn() }));
vi.mock('wxt/browser', () => ({ browser: { permissions: { contains: mocks.access }, commands: { getAll: mocks.commands } } }));
vi.mock('./switcher-preference', () => ({ recentTabsOnItem: { getValue: mocks.preference } }));

import { recentTabsEnabled } from './enabled';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.preference.mockResolvedValue(true);
  mocks.access.mockResolvedValue(true);
  mocks.commands.mockResolvedValue([{ name: 'cycle-recent-tabs', shortcut: 'Alt+Period' }]);
});

it('the saved toggle disables the switcher before asking Chrome about shortcuts or permissions', async () => {
  mocks.preference.mockResolvedValue(false);
  expect(await recentTabsEnabled()).toBe(false);
  expect(mocks.commands).not.toHaveBeenCalled();
  expect(mocks.access).not.toHaveBeenCalled();
});

it('turning the toggle on still requires an assigned shortcut and site access', async () => {
  expect(await recentTabsEnabled()).toBe(true);
  mocks.commands.mockResolvedValue([]);
  expect(await recentTabsEnabled()).toBe(false);
  mocks.commands.mockResolvedValue([{ name: 'cycle-recent-tabs-previous', shortcut: 'Alt+Comma' }]);
  mocks.access.mockResolvedValue(false);
  expect(await recentTabsEnabled()).toBe(false);
});
