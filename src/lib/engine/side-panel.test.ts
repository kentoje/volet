import { beforeEach, describe, expect, it, vi } from 'vitest';

let openPanels: Record<string, true> = {};
const sidePanel = {
  open: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve()),
};

vi.mock('wxt/utils/storage', () => ({
  storage: { defineItem: () => ({ getValue: async () => openPanels, setValue: async () => undefined }) },
}));
vi.mock('wxt/browser', () => ({ browser: { sidePanel } }));

const { toggleSidePanel } = await import('./side-panel');

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('toggleSidePanel', () => {
  beforeEach(() => {
    openPanels = {};
    sidePanel.open.mockClear();
    sidePanel.close.mockClear();
  });

  it('opens a closed panel right away, while the shortcut still counts as a user gesture', async () => {
    toggleSidePanel(1);
    expect(sidePanel.open).toHaveBeenCalledWith({ windowId: 1 });
    await settle();
    expect(sidePanel.close).not.toHaveBeenCalled();
  });

  it('closes the panel when that window was showing it', async () => {
    openPanels = { 1: true };
    toggleSidePanel(1);
    await settle();
    expect(sidePanel.close).toHaveBeenCalledWith({ windowId: 1 });
  });

  it('leaves the panels of other windows alone', async () => {
    openPanels = { 2: true };
    toggleSidePanel(1);
    await settle();
    expect(sidePanel.close).not.toHaveBeenCalled();
  });
});
