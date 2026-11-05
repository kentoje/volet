import type { Locator, Page, Worker } from '@playwright/test';
import { bookmarkTree, expect, stripState, test } from './fixtures';

const visiblePage = (panel: Page) => panel.locator('section:not([inert])');

/** Drag with real pointer events, the way a person would (past dnd-kit's activation distance). */
async function drag(panel: Page, from: Locator, to: Locator, { offsetY = 0 } = {}) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await panel.mouse.move(a.x + 30, a.y + a.height / 2);
  await panel.mouse.down();
  await panel.mouse.move(a.x + 30, a.y + a.height / 2 + 10, { steps: 4 });
  // Wide targets (rows) are aimed near their left edge, small ones (dots, tiles) at their center.
  await panel.mouse.move(b.x + (b.width > 80 ? 30 : b.width / 2), b.y + b.height / 2 + offsetY, { steps: 15 });
  await panel.waitForTimeout(150);
  await panel.mouse.up();
}

async function openTabs(worker: Worker, windowId: number, titles: string[]) {
  await worker.evaluate(
    async ({ id, titles }) => {
      for (const title of titles) await chrome.tabs.create({ windowId: id, url: `data:text/html,<title>${title}</title>` });
    },
    { id: windowId, titles },
  );
}

const row = (panel: Page, name: string) => visiblePage(panel).getByRole('button', { name, exact: true });

test('reordering temporary tabs reorders them in Chrome', async ({ worker, windowId, panel }) => {
  await openTabs(worker, windowId, ['Alpha', 'Beta', 'Gamma']);
  await expect(row(panel, 'Gamma')).toBeVisible();
  await drag(panel, row(panel, 'Gamma'), row(panel, 'Alpha'));
  await expect
    .poll(async () => (await stripState(worker, windowId)).map((tab) => tab.url.match(/<title>(\w+)/)?.[1]).filter(Boolean))
    .toEqual(['Gamma', 'Alpha', 'Beta']);
});

test('dragging a tab into the pinned area pins it, and back out unpins it', async ({ worker, windowId, panel }) => {
  await openTabs(worker, windowId, ['Keeper']);
  await expect(row(panel, 'Keeper')).toBeVisible();
  const hint = visiblePage(panel).getByText('Drag tabs here to pin them');
  await drag(panel, row(panel, 'Keeper'), hint);
  await expect
    .poll(async () => (await bookmarkTree(worker)).children!.find((c) => c.title === 'Home')!.children!.map((c) => c.title))
    .toEqual(['Keeper']);
  await expect(visiblePage(panel).getByRole('button', { name: 'Close tab, keep pin' })).toBeAttached();

  // Back down below the divider: the pin goes, the tab stays.
  await drag(panel, row(panel, 'Keeper'), visiblePage(panel).getByRole('button', { name: 'New tab' }), { offsetY: -20 });
  await expect
    .poll(async () => (await bookmarkTree(worker)).children!.find((c) => c.title === 'Home')!.children!.length)
    .toBe(0);
  expect((await stripState(worker, windowId)).some((tab) => tab.url.includes('Keeper'))).toBe(true);
});

test('dragging a tab to the favorites area makes it a favorite', async ({ worker, windowId, panel }) => {
  await openTabs(worker, windowId, ['Mail']);
  await worker.evaluate(async (id) => {
    // A first favorite so the grid has a visible target.
    const tab = await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Calendar</title>' });
    await chrome.tabs.update(tab.id!, { pinned: true });
  }, windowId);
  const grid = panel.getByRole('list', { name: 'Favorites' });
  await expect(grid.getByRole('button')).toHaveCount(1);
  await drag(panel, row(panel, 'Mail'), grid.getByRole('button').first());
  await expect(grid.getByRole('button')).toHaveCount(2);
  await expect
    .poll(async () => (await stripState(worker, windowId)).find((tab) => tab.url.includes('Mail'))?.pinned)
    .toBe(true);
});

test('dropping a tab on a Space dot moves it to that Space', async ({ worker, windowId, panel }) => {
  await panel.getByRole('button', { name: 'New Space' }).click();
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Space 2');
  await panel.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Home');
  await openTabs(worker, windowId, ['Traveler']);
  await expect(row(panel, 'Traveler')).toBeVisible();
  // Let the engine finish placing the new tab before dragging it.
  await expect
    .poll(async () => (await stripState(worker, windowId)).find((tab) => tab.url.includes('Traveler'))?.group)
    .toBe('Home');
  await drag(panel, row(panel, 'Traveler'), panel.getByRole('button', { name: 'Space 2', exact: true }));
  await expect
    .poll(async () => (await stripState(worker, windowId)).find((tab) => tab.url.includes('Traveler'))?.group)
    .toBe('Space 2');
  await expect(row(panel, 'Traveler')).toHaveCount(0);
});
