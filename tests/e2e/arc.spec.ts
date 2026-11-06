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

async function chooseArcFile(page: Page) {
  await page.locator('input[type=file]').setInputFiles({
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

test('the import page reads a remembered Arc file again, without the file picker', async ({ context, worker }) => {
  const page = await context.newPage();
  await page.goto(extensionPage(worker, 'import.html'));
  await expect(page.getByRole('heading', { name: "Find Arc's sidebar file" })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use your Arc file' })).toHaveCount(0);

  // Remember a file as the picker would: a handle in IndexedDB (here, one from the page's private file system).
  await page.evaluate(async (json) => {
    const directory = await navigator.storage.getDirectory();
    const handle = await directory.getFileHandle('StorableSidebar.json', { create: true });
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('volet', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('files');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction('files', 'readwrite');
        transaction.objectStore('files').put(handle, 'arc-sidebar');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, JSON.stringify(ARC));

  await page.reload();
  await page.getByRole('button', { name: 'Use your Arc file' }).click();
  await expect(page.getByRole('checkbox', { name: /Reading/ })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Import 3 Volets' })).toBeVisible();
});
