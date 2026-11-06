import { bookmarkTree, command, expect, stripState, test } from './fixtures';

const visiblePage = (panel: import('@playwright/test').Page) => panel.locator('section:not([inert])');

test('first run creates the bookmark folders and adopts open tabs into the first Volet', async ({ worker, windowId, panel }) => {
  expect(await bookmarkTree(worker)).toEqual({
    title: 'Spaces',
    children: [
      { title: 'Favorites', children: [] },
      { title: 'Volet 1 (click to rename)', children: [] },
    ],
  });
  await expect.poll(async () => (await stripState(worker, windowId)).every((tab) => tab.group === 'Volet 1 (click to rename)')).toBe(true);
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Volet 1 (click to rename)');
});

test('tabs opened outside the sidebar join the active Space', async ({ worker, windowId, panel }) => {
  await worker.evaluate(async (id) => {
    await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>One</title>' });
    await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Two</title>' });
  }, windowId);
  await expect.poll(async () => (await stripState(worker, windowId)).map((tab) => tab.group)).toEqual([
    'Volet 1 (click to rename)',
    'Volet 1 (click to rename)',
    'Volet 1 (click to rename)',
  ]);
  const page = visiblePage(panel);
  await expect(page.getByRole('button', { name: 'One' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Two', exact: true })).toBeVisible();
  // The active tab is highlighted.
  await expect(page.getByRole('button', { name: 'Two', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('creating and switching Spaces collapses the other groups', async ({ worker, windowId, panel }) => {
  await panel.getByRole('button', { name: 'New Volet' }).click();
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Volet 2');
  await expect
    .poll(async () => {
      const strip = await stripState(worker, windowId);
      return {
        home: strip.filter((tab) => tab.group === 'Volet 1 (click to rename)').every((tab) => tab.collapsed),
        second: strip.some((tab) => tab.group === 'Volet 2' && tab.active && !tab.collapsed),
      };
    })
    .toEqual({ home: true, second: true });

  await panel.getByRole('button', { name: 'Volet 1 (click to rename)', exact: true }).click();
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Volet 1 (click to rename)');
  await expect
    .poll(async () => {
      const strip = await stripState(worker, windowId);
      return strip.find((tab) => tab.active)?.group;
    })
    .toBe('Volet 1 (click to rename)');
  expect((await stripState(worker, windowId)).filter((tab) => tab.group === 'Volet 2').every((t) => t.collapsed)).toBe(
    true,
  );
});

test('pins keep their entry when their tab closes, and reopen on click', async ({ worker, windowId, panel }) => {
  const tabId = await worker.evaluate(async (id) => {
    const tab = await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Docs</title>' });
    return tab.id!;
  }, windowId);
  const home = (await bookmarkTree(worker)).children!.find((c) => c.title === 'Volet 1 (click to rename)')!;
  expect(home).toBeTruthy();
  const homeId = await worker.evaluate(async () => {
    const { root } = (await chrome.storage.local.get('root')) as { root: { rootId: string } };
    const children = await chrome.bookmarks.getChildren(root.rootId);
    return children.find((c) => c.title === 'Volet 1 (click to rename)')!.id;
  });
  await expect.poll(async () => (await stripState(worker, windowId)).find((t) => t.id === tabId)?.group).toBe('Volet 1 (click to rename)');
  // A pin keeps the title its tab had when it was saved: wait for the page to load.
  await expect.poll(() => worker.evaluate(async (id) => (await chrome.tabs.get(id)).title, tabId)).toBe('Docs');
  const result = await command(panel, { type: 'pinTab', windowId, tabId, parentId: homeId });
  expect(result.ok).toBe(true);

  const page = visiblePage(panel);
  const pin = page.getByRole('button', { name: 'Docs', exact: true });
  await expect(pin).toBeVisible();
  const pinRow = page.getByRole('listitem').filter({ has: panel.getByRole('button', { name: 'Docs', exact: true }) });
  await pinRow.getByRole('button', { name: 'Close tab' }).click();
  await expect.poll(async () => (await stripState(worker, windowId)).some((t) => t.id === tabId)).toBe(false);
  await expect(page.getByRole('button', { name: 'Docs', exact: true })).toHaveCount(1); // still listed, now unloaded

  await pin.click();
  await expect
    .poll(async () => (await stripState(worker, windowId)).find((t) => t.active)?.url)
    .toContain('<title>Docs</title>');
  await expect(pinRow.getByRole('button', { name: 'Close tab' })).toBeAttached();
});

test('pinning a tab natively in Chrome makes it a favorite', async ({ worker, windowId, panel }) => {
  await worker.evaluate(async (id) => {
    const tab = await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Mail</title>' });
    await chrome.tabs.update(tab.id!, { pinned: true });
  }, windowId);
  await expect
    .poll(async () => (await bookmarkTree(worker)).children!.find((c) => c.title === 'Favorites')!.children!.length)
    .toBe(1);
  await expect(panel.getByRole('list', { name: 'Favorites' }).getByRole('button')).toHaveCount(1);
});

test('closing a temporary tab from the sidebar closes it in Chrome', async ({ worker, windowId, panel }) => {
  await worker.evaluate(async (id) => {
    await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Temp</title>' });
  }, windowId);
  const page = visiblePage(panel);
  const row = page.getByRole('button', { name: 'Temp', exact: true });
  await expect(row).toBeVisible();
  await row.hover();
  // `has` is resolved inside each list item, so it must not be anchored to the page section.
  const item = page.getByRole('listitem').filter({ has: panel.getByRole('button', { name: 'Temp', exact: true }) });
  await item.getByRole('button', { name: 'Close tab' }).click();
  await expect(row).toHaveCount(0);
  await expect.poll(async () => (await stripState(worker, windowId)).some((t) => t.url.includes('Temp'))).toBe(false);
});

/** Close a temporary tab with its row's close button, like the user does. */
async function closeRow(panel: import('@playwright/test').Page, name: string) {
  const page = visiblePage(panel);
  await page.getByRole('button', { name, exact: true }).hover();
  const item = page.getByRole('listitem').filter({ has: panel.getByRole('button', { name, exact: true }) });
  await item.getByRole('button', { name: 'Close tab' }).click();
}

test("closing a Volet's last tab shows a favorite and leaves the Volet empty", async ({ worker, windowId, panel }) => {
  // One favorite, and one temporary tab in the first Volet: the active one.
  await worker.evaluate(async (id) => {
    const others = await chrome.tabs.query({ windowId: id });
    await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Mail</title>', pinned: true });
    await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Last</title>' });
    await chrome.tabs.remove(others.map((tab) => tab.id!));
  }, windowId);
  await expect(panel.getByRole('list', { name: 'Favorites' }).getByRole('button')).toHaveCount(1);
  await expect(visiblePage(panel).getByRole('button', { name: 'Last', exact: true })).toBeVisible();

  await closeRow(panel, 'Last');
  await expect
    .poll(async () => (await stripState(worker, windowId)).map((tab) => ({ pinned: tab.pinned, active: tab.active })))
    .toEqual([{ pinned: true, active: true }]);
  // No tab took its place, and the sidebar stays on the first Volet.
  await panel.waitForTimeout(300);
  expect(await stripState(worker, windowId)).toHaveLength(1);
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Volet 1 (click to rename)');
});

test('a lone New Tab page closes instead of coming back', async ({ worker, windowId, panel }) => {
  // A new Volet starts with one New Tab page, and no favorite is open.
  await panel.getByRole('button', { name: 'New Volet' }).click();
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Volet 2');
  await expect
    .poll(async () => (await stripState(worker, windowId)).filter((tab) => tab.group === 'Volet 2').length)
    .toBe(1);
  const before = (await stripState(worker, windowId)).length;

  await closeRow(panel, 'New Tab');
  await expect
    .poll(async () => (await stripState(worker, windowId)).some((tab) => tab.group === 'Volet 2'))
    .toBe(false);
  await panel.waitForTimeout(300);
  expect(await stripState(worker, windowId)).toHaveLength(before - 1);
});

test('a new tab from the sidebar stops showing as loading', async ({ panel }) => {
  // Chrome's tabs.query can still say "loading" right after the "complete" event; the panel must not get stuck.
  const page = visiblePage(panel);
  await page.getByRole('button', { name: 'New tab', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Tab', exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0);
});

test('the unpin button turns a pin into a temporary tab in one click', async ({ worker, windowId, panel }) => {
  const tabId = await worker.evaluate(
    async (id) => (await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Draft</title>' })).id!,
    windowId,
  );
  await expect.poll(() => worker.evaluate(async (id) => (await chrome.tabs.get(id)).title, tabId)).toBe('Draft');
  const homeId = await worker.evaluate(async () => {
    const { root } = (await chrome.storage.local.get('root')) as { root: { rootId: string } };
    return (await chrome.bookmarks.getChildren(root.rootId)).find((c) => c.title === 'Volet 1 (click to rename)')!.id;
  });
  await command(panel, { type: 'pinTab', windowId, tabId, parentId: homeId });

  const page = visiblePage(panel);
  const pinRow = page.getByRole('listitem').filter({ has: panel.getByRole('button', { name: 'Draft', exact: true }) });
  await pinRow.hover();
  await pinRow.getByRole('button', { name: 'Unpin' }).click();
  await expect.poll(async () => (await bookmarkTree(worker)).children!.find((c) => c.title === 'Volet 1 (click to rename)')!.children).toEqual([]);
  // Still open, now below the divider.
  await expect(page.getByRole('button', { name: 'Draft', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unpin' })).toHaveCount(0);
  expect((await stripState(worker, windowId)).some((tab) => tab.id === tabId)).toBe(true);
});

test('a pin that moved to another page offers a way back', async ({ worker, windowId, panel }) => {
  // Two of the extension's own pages: Chrome doesn't let extensions navigate tabs to data: URLs.
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const tabId = await worker.evaluate(async ({ id, url }) => (await chrome.tabs.create({ windowId: id, url })).id!, {
    id: windowId,
    url: `${origin}/options.html`,
  });
  await expect.poll(() => worker.evaluate(async (id) => (await chrome.tabs.get(id)).title, tabId)).toBe('Volet settings');
  const homeId = await worker.evaluate(async () => {
    const { root } = (await chrome.storage.local.get('root')) as { root: { rootId: string } };
    return (await chrome.bookmarks.getChildren(root.rootId)).find((c) => c.title === 'Volet 1 (click to rename)')!.id;
  });
  await command(panel, { type: 'pinTab', windowId, tabId, parentId: homeId });

  const page = visiblePage(panel);
  await expect(page.getByRole('button', { name: 'Volet settings', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to the pinned page' })).toHaveCount(0); // not moved yet
  await worker.evaluate(async ({ id, url }) => chrome.tabs.update(id, { url }), { id: tabId, url: `${origin}/import.html` });
  const row = page.getByRole('listitem').filter({ has: panel.getByRole('button', { name: 'Import from Arc' }) });
  await expect(row).toContainText('/');
  await row.hover();
  await row.getByRole('button', { name: 'Back to the pinned page' }).click();
  await expect.poll(() => worker.evaluate(async (id) => (await chrome.tabs.get(id)).title, tabId)).toBe('Volet settings');
  await expect(page.getByRole('button', { name: 'Back to the pinned page' })).toHaveCount(0);
});

test("rows show the icon Chrome shows on the tab", async ({ worker, windowId, panel }) => {
  // A page with its own favicon (a 1px PNG), which Chrome's favicon cache doesn't know yet.
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  await worker.evaluate(
    async ({ id, url }) => chrome.tabs.create({ windowId: id, url }),
    { id: windowId, url: `data:text/html,<title>Iconic</title><link rel="icon" href="${png}">` },
  );
  await expect
    .poll(() => worker.evaluate(async () => (await chrome.tabs.query({})).find((t) => t.title === 'Iconic')?.favIconUrl))
    .toBe(png);
  const row = visiblePage(panel).getByRole('button', { name: 'Iconic', exact: true });
  await expect(row.locator('img')).toHaveAttribute('src', png);
});

/** Adds empty Volets (folders under the root) until there are `total`, named "Extra 2", "Extra 3"... */
function fillVolets(worker: import('@playwright/test').Worker, total: number) {
  return worker.evaluate(async (count) => {
    const { root } = (await chrome.storage.local.get('root')) as { root: { rootId: string; favoritesId: string } };
    const existing = (await chrome.bookmarks.getChildren(root.rootId)).filter((n) => !n.url && n.id !== root.favoritesId);
    for (let i = existing.length; i < count; i++) await chrome.bookmarks.create({ parentId: root.rootId, title: `Extra ${i + 1}` });
  }, total);
}

test('Volets stop at 8: the New Volet button turns off and the engine refuses more', async ({ worker, windowId, panel }) => {
  await fillVolets(worker, 8);
  const dots = panel.getByRole('navigation', { name: 'Volets' }).locator('li button');
  await expect(dots).toHaveCount(8);
  const add = panel.getByRole('button', { name: 'New Volet' });
  await expect(add).toHaveAttribute('aria-disabled', 'true');
  await add.click({ force: true }); // Playwright waits on aria-disabled buttons; a user can still click it

  const refused = await command(panel, { type: 'createSpace', windowId });
  expect(refused).toEqual({ ok: false, error: 'There can be at most 8 Spaces' });
  expect((await bookmarkTree(worker)).children).toHaveLength(9); // Favorites and the eight Volets
  await expect(dots).toHaveCount(8);

  // Deleting one makes room again.
  await worker.evaluate(async () => {
    const [extra] = await chrome.bookmarks.search({ title: 'Extra 8' });
    await chrome.bookmarks.removeTree(extra!.id);
  });
  await expect(add).not.toHaveAttribute('aria-disabled');
});

test('at 8 Volets, a tab group made in Chrome joins the active Volet instead of becoming a new one', async ({
  worker,
  windowId,
  panel,
}) => {
  await fillVolets(worker, 8);
  await expect(panel.getByRole('navigation', { name: 'Volets' }).locator('li button')).toHaveCount(8);
  await worker.evaluate(async (id) => {
    const tab = await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Grouped</title>', active: false });
    await chrome.tabs.group({ tabIds: [tab.id!], createProperties: { windowId: id } });
  }, windowId);

  await expect
    .poll(async () => (await stripState(worker, windowId)).find((tab) => tab.url.includes('Grouped'))?.group)
    .toBe('Volet 1 (click to rename)');
  expect((await bookmarkTree(worker)).children).toHaveLength(9);
  await expect(visiblePage(panel).getByRole('button', { name: 'Grouped', exact: true })).toBeVisible();
});
