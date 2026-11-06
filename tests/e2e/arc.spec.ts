import type { Page, Worker } from '@playwright/test';
import { expect, test } from './fixtures';

const extensionPage = (worker: Worker, path: string) => `chrome-extension://${new URL(worker.url()).host}/${path}`;
const visiblePage = (panel: Page) => panel.locator('section:not([inert])');

/** A sidebar in Arc's StorableSidebar.json format: Spaces with pinned tabs. */
function arcFile(spaces: { id: string; title: string; pins: string[] }[]) {
  const spaceEntries: unknown[] = [];
  const items: unknown[] = [];
  for (const space of spaces) {
    const container = `${space.id}-pinned`;
    const tabIds = space.pins.map((_, index) => `${space.id}-t${index}`);
    spaceEntries.push(space.id, { id: space.id, title: space.title, containerIDs: ['pinned', container] });
    items.push(container, { id: container, childrenIds: tabIds, data: { itemContainer: {} } });
    space.pins.forEach((title, index) => {
      const url = `https://${title.toLowerCase()}.example/`;
      items.push(tabIds[index], { id: tabIds[index], childrenIds: [], data: { tab: { savedURL: url, savedTitle: title } } });
    });
  }
  return { sidebar: { containers: [{ global: {} }, { spaces: spaceEntries, items }] } };
}

const ARC = arcFile([
  { id: 'S1', title: 'Work', pins: ['Board'] },
  { id: 'S2', title: 'Reading', pins: ['Paper'] },
  { id: 'S3', title: 'Side project', pins: ['Repo'] },
]);

/**
 * Click the drop zone and pick the file, as a user would. It must open the classic file chooser: Chrome's File
 * System Access picker refuses files under ~/Library, where Arc keeps its sidebar.
 */
async function chooseArcFile(page: Page) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('Drop StorableSidebar.json here').click();
  await (await chooser).setFiles({
    name: 'StorableSidebar.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(ARC)),
  });
}

test('a first run invites Arc users to import, until they dismiss it', async ({ context, panel }) => {
  const card = panel.getByRole('complementary', { name: 'Coming from Arc?' });
  await expect(card).toBeVisible();
  const opened = context.waitForEvent('page', (page) => page.url().endsWith('/import.html'));
  await card.getByRole('button', { name: 'Import from Arc' }).click();
  await opened;
  await expect(card).toBeVisible(); // opening the page isn't importing

  await card.getByRole('button', { name: 'Dismiss' }).click();
  await expect(card).toHaveCount(0);
  await panel.reload();
  await expect(panel.getByRole('navigation', { name: 'Volets' })).toBeVisible();
  await expect(card).toHaveCount(0);
});

test('Arc Spaces left out of an import are offered by the New Volet button', async ({ context, worker, panel }) => {
  const page = await context.newPage();
  await page.goto(extensionPage(worker, 'import.html'));
  await chooseArcFile(page);
  await page.getByRole('checkbox', { name: /Reading/ }).uncheck();
  await page.getByRole('checkbox', { name: /Side project/ }).uncheck();
  await page.getByRole('button', { name: 'Import 1 Volet' }).click();
  await expect(page.getByRole('status')).toContainText('Imported 1 Volet');
  await expect(page.getByText('stay a click away')).toBeVisible();
  // Importing is what the welcome card asked for: it's gone.
  await expect(panel.getByRole('complementary', { name: 'Coming from Arc?' })).toHaveCount(0);

  const add = panel.getByRole('button', { name: 'New Volet' });
  const menu = panel.getByRole('menu');
  await add.click();
  await expect(menu.getByRole('menuitem')).toHaveText(['New Volet', 'Reading', 'Side project', 'Stop suggesting Arc Spaces']);
  await menu.getByRole('menuitem', { name: 'Reading' }).click();
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Reading');
  await expect(visiblePage(panel).getByRole('button', { name: 'Paper', exact: true })).toBeVisible();

  await add.click();
  await expect(menu.getByRole('menuitem')).toHaveText(['New Volet', 'Side project', 'Stop suggesting Arc Spaces']);
  await menu.getByRole('menuitem', { name: 'Stop suggesting Arc Spaces' }).click();
  // Nothing left to offer: the button makes a Volet again.
  const dots = panel.getByRole('navigation', { name: 'Volets' }).locator('li button');
  const before = await dots.count();
  await add.click();
  await expect(dots).toHaveCount(before + 1);
  await expect(menu).toHaveCount(0);

  // Choosing the file again: what's already in starts unchecked.
  await page.goto(extensionPage(worker, 'import.html'));
  await chooseArcFile(page);
  await expect(page.getByRole('checkbox', { name: /Work.*already imported/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Reading.*already imported/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Side project/ })).toBeChecked();
});

test('the import page offers the Arc Spaces read last time, without the file', async ({ context, worker }) => {
  const page = await context.newPage();
  await page.goto(extensionPage(worker, 'import.html'));
  await expect(page.getByRole('heading', { name: "Find Arc's sidebar file" })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review your Arc Spaces' })).toHaveCount(0);
  await chooseArcFile(page);
  await expect(page.getByRole('checkbox', { name: /Reading/ })).toBeVisible();

  // Coming back later: no need to find the file again.
  await page.reload();
  await expect(page.getByText('Volet kept the 3 Spaces from your Arc file')).toBeVisible();
  await page.getByRole('button', { name: 'Review your Arc Spaces' }).click();
  await expect(page.getByRole('checkbox', { name: /Reading/ })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Import 3 Volets' })).toBeVisible();
});

test("an Arc title saved from a broken page follows the page once it loads; a custom Arc name stays", async ({
  context,
  worker,
  panel,
}) => {
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  // Arc saved "Page not found" for the first tab; the user named the second one.
  const file = {
    sidebar: {
      containers: [
        { global: {} },
        {
          spaces: ['S1', { id: 'S1', title: 'Work', containerIDs: ['pinned', 'P1'] }],
          items: [
            'P1',
            { id: 'P1', childrenIds: ['t1', 't2'], data: { itemContainer: {} } },
            't1',
            { id: 't1', title: null, childrenIds: [], data: { tab: { savedURL: `${origin}/options.html`, savedTitle: 'Page not found' } } },
            't2',
            { id: 't2', title: 'My import page', childrenIds: [], data: { tab: { savedURL: `${origin}/import.html`, savedTitle: 'x' } } },
          ],
        },
      ],
    },
  };
  const page = await context.newPage();
  await page.goto(extensionPage(worker, 'import.html'));
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('Drop StorableSidebar.json here').click();
  await (await chooser).setFiles({ name: 'StorableSidebar.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await page.getByRole('button', { name: 'Import 1 Volet' }).click();
  await expect(page.getByRole('status')).toContainText('Imported 1 Volet');
  await page.close();

  await panel.getByRole('navigation', { name: 'Volets' }).getByRole('button', { name: 'Work', exact: true }).click();
  const rows = visiblePage(panel);
  // Opening both pins loads their pages.
  await rows.getByRole('button', { name: 'Page not found', exact: true }).click();
  await rows.getByRole('button', { name: 'My import page', exact: true }).click();
  await expect(rows.getByRole('button', { name: 'Volet settings', exact: true })).toBeVisible();
  await panel.waitForTimeout(300);
  await expect(rows.getByRole('button', { name: 'My import page', exact: true })).toBeVisible();
});
