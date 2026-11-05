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
