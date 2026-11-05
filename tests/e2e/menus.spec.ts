import type { Page } from '@playwright/test';
import { bookmarkTree, command, expect, stripState, test } from './fixtures';

const visiblePage = (panel: Page) => panel.locator('section:not([inert])');
const menuItem = (panel: Page, name: string) => panel.getByRole('menuitem', { name, exact: true });

test('renaming a Space renames its bookmark folder and tab group', async ({ worker, windowId, panel }) => {
  await visiblePage(panel).getByRole('heading').dblclick();
  const field = panel.getByRole('textbox', { name: 'Space name' });
  await field.fill('Studio');
  await field.press('Enter');
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Studio');
  await expect.poll(async () => (await bookmarkTree(worker)).children!.map((c) => c.title)).toEqual(['Favorites', 'Studio']);
  await expect.poll(async () => (await stripState(worker, windowId))[0]?.group).toBe('Studio');
});

test('the Space menu recolors the Space and its tab group', async ({ worker, windowId, panel }) => {
  await visiblePage(panel).getByRole('heading').click({ button: 'right' });
  await panel.getByRole('menuitem', { name: 'Hue 152' }).click();
  await expect
    .poll(() => worker.evaluate(async () => (await chrome.storage.sync.get('spaceMeta')).spaceMeta))
    .toEqual({ Home: { hue: 152 } });
  await expect
    .poll(() =>
      worker.evaluate(async (id) => (await chrome.tabGroups.query({ windowId: id }))[0]?.color, windowId),
    )
    .toBe('green');
  expect((await stripState(worker, windowId)).length).toBeGreaterThan(0);
});

test('deleting a Space asks first, then closes its tabs', async ({ worker, windowId, panel }) => {
  await panel.getByRole('button', { name: 'New Space' }).click();
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Space 2');
  await visiblePage(panel).getByRole('heading').click({ button: 'right' });
  await menuItem(panel, 'Delete Space').click();
  await expect(panel.getByRole('alertdialog')).toContainText('Delete “Space 2”?');
  await panel.getByRole('button', { name: 'Delete Space' }).click();
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Home');
  await expect.poll(async () => (await bookmarkTree(worker)).children!.map((c) => c.title)).toEqual(['Favorites', 'Home']);
  await expect.poll(async () => (await stripState(worker, windowId)).every((tab) => tab.group === 'Home')).toBe(true);
});

test('pins can be renamed and folders created from menus', async ({ worker, windowId, panel }) => {
  const tabId = await worker.evaluate(
    async (id) => (await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Report</title>' })).id!,
    windowId,
  );
  await expect.poll(() => worker.evaluate(async (id) => (await chrome.tabs.get(id)).title, tabId)).toBe('Report');
  const homeId = await worker.evaluate(async () => {
    const { root } = (await chrome.storage.local.get('root')) as { root: { rootId: string } };
    return (await chrome.bookmarks.getChildren(root.rootId)).find((c) => c.title === 'Home')!.id;
  });
  await command(panel, { type: 'pinTab', windowId, tabId, parentId: homeId });

  await visiblePage(panel).getByRole('button', { name: 'Report', exact: true }).click({ button: 'right' });
  await menuItem(panel, 'Rename').click();
  const field = panel.getByRole('textbox', { name: 'Pin name' });
  await field.fill('Weekly report');
  await field.press('Enter');
  await visiblePage(panel).getByRole('heading').click({ button: 'right' });
  await menuItem(panel, 'New folder').click();

  await expect
    .poll(async () => (await bookmarkTree(worker)).children!.find((c) => c.title === 'Home')!.children!.map((c) => c.title))
    .toEqual(['New folder', 'Weekly report']);
  await expect(visiblePage(panel).getByRole('button', { name: 'New folder' })).toBeVisible();
});

test('menus stay inside a narrow panel, even from its corner', async ({ panel }) => {
  await panel.setViewportSize({ width: 300, height: 500 });
  await panel.getByRole('button', { name: 'New Space' }).click();
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Space 2');
  // The last dot sits near the bottom-right corner.
  await panel.getByRole('navigation', { name: 'Spaces' }).getByRole('button', { name: 'Space 2' }).click({ button: 'right' });
  const menu = panel.getByRole('menu');
  await expect(menu).toBeVisible();
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(300);
  expect(box.y + box.height).toBeLessThanOrEqual(500);
});

test('a menu closes when the panel loses focus (a click in the page)', async ({ panel }) => {
  await visiblePage(panel).getByRole('heading').click({ button: 'right' });
  await expect(panel.getByRole('menu')).toBeVisible();
  // A click in the web page happens in another document: the panel only sees itself lose focus.
  await panel.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(panel.getByRole('menu')).toHaveCount(0);
});

test('hovering a Space dot shows its name', async ({ panel }) => {
  await panel.getByRole('navigation', { name: 'Spaces' }).getByRole('button', { name: 'Home' }).hover();
  await expect(panel.locator('[data-tooltip-content]')).toHaveText('Home');
});

/** Record every tooltip mount and state change in the panel from now on. */
const watchTooltips = (panel: Page) =>
  panel.evaluate(() => {
    const log: string[] = ((window as unknown as { tooltipLog: string[] }).tooltipLog = []);
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes.length) log.push('mounted');
        if (m.type === 'attributes') log.push((m.target as HTMLElement).dataset.state ?? '');
      }
    }).observe(document.querySelector('[data-overlay-root]')!, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });
  });
const tooltipLog = (panel: Page) => panel.evaluate(() => (window as unknown as { tooltipLog: string[] }).tooltipLog);

test('the Space dots share one tooltip, which moves to the hovered dot', async ({ panel }) => {
  await panel.getByRole('button', { name: 'New Space' }).click();
  const dots = panel.getByRole('navigation', { name: 'Spaces' }).locator('li button');
  await expect(dots).toHaveCount(2);
  // (The New Space button's own tooltip may still be fading out.)
  const tooltip = panel.locator('[data-tooltip-content]:not([data-state="closed"])');

  await dots.nth(0).hover();
  await expect(tooltip).toHaveText('Home');
  await watchTooltips(panel);
  await dots.nth(1).hover();
  await expect(tooltip).toHaveText((await dots.nth(1).getAttribute('aria-label'))!);
  await expect(tooltip).toHaveCount(1);
  // It never closed or remounted on the way: the same tooltip moved.
  expect(await tooltipLog(panel)).toEqual([]);
});

test("a row's buttons share one tooltip, gone as soon as the pointer leaves them", async ({ worker, windowId, panel }) => {
  const tabId = await worker.evaluate(
    async (id) => (await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Report</title>' })).id!,
    windowId,
  );
  await expect.poll(() => worker.evaluate(async (id) => (await chrome.tabs.get(id)).title, tabId)).toBe('Report');
  const homeId = await worker.evaluate(async () => {
    const { root } = (await chrome.storage.local.get('root')) as { root: { rootId: string } };
    return (await chrome.bookmarks.getChildren(root.rootId)).find((c) => c.title === 'Home')!.id;
  });
  await command(panel, { type: 'pinTab', windowId, tabId, parentId: homeId });
  const tooltip = panel.locator('[data-tooltip-content]');
  const pinRow = visiblePage(panel).locator('li', { has: panel.getByRole('button', { name: 'Report', exact: true }) });

  await pinRow.hover();
  await pinRow.getByRole('button', { name: 'Unpin' }).hover();
  await expect(tooltip).toHaveText('Unpin (it moves to the tabs below)');
  await watchTooltips(panel);
  const close = pinRow.getByRole('button', { name: 'Close tab' });
  await close.hover();
  await expect(tooltip).toHaveText('Close tab (it stays pinned)');
  expect(await tooltipLog(panel)).toEqual([]);

  // Up toward the row above, through where the tooltip sits: it is already gone.
  const box = (await close.boundingBox())!;
  await panel.mouse.move(box.x + box.width / 2, box.y - 14);
  await expect(tooltip).toHaveCount(0);
});
