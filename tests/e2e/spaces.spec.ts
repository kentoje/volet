import { bookmarkTree, command, expect, stripState, test } from './fixtures';

const visiblePage = (panel: import('@playwright/test').Page) => panel.locator('section:not([inert])');

test('first run creates the bookmark folders and adopts open tabs into Home', async ({ worker, windowId, panel }) => {
  expect(await bookmarkTree(worker)).toEqual({
    title: 'Spaces',
    children: [
      { title: 'Favorites', children: [] },
      { title: 'Home', children: [] },
    ],
  });
  await expect.poll(async () => (await stripState(worker, windowId)).every((tab) => tab.group === 'Home')).toBe(true);
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Home');
});

test('tabs opened outside the sidebar join the active Space', async ({ worker, windowId, panel }) => {
  await worker.evaluate(async (id) => {
    await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>One</title>' });
    await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Two</title>' });
  }, windowId);
  await expect.poll(async () => (await stripState(worker, windowId)).map((tab) => tab.group)).toEqual([
    'Home',
    'Home',
    'Home',
  ]);
  const page = visiblePage(panel);
  await expect(page.getByRole('button', { name: 'One' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Two', exact: true })).toBeVisible();
  // The active tab is highlighted.
  await expect(page.getByRole('button', { name: 'Two', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('creating and switching Spaces collapses the other groups', async ({ worker, windowId, panel }) => {
  await panel.getByRole('button', { name: 'New Space' }).click();
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Space 2');
  await expect
    .poll(async () => {
      const strip = await stripState(worker, windowId);
      return {
        home: strip.filter((tab) => tab.group === 'Home').every((tab) => tab.collapsed),
        second: strip.some((tab) => tab.group === 'Space 2' && tab.active && !tab.collapsed),
      };
    })
    .toEqual({ home: true, second: true });

  await panel.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(visiblePage(panel).getByRole('heading')).toHaveText('Home');
  await expect
    .poll(async () => {
      const strip = await stripState(worker, windowId);
      return strip.find((tab) => tab.active)?.group;
    })
    .toBe('Home');
  expect((await stripState(worker, windowId)).filter((tab) => tab.group === 'Space 2').every((t) => t.collapsed)).toBe(
    true,
  );
});

test('pins keep their entry when their tab closes, and reopen on click', async ({ worker, windowId, panel }) => {
  const tabId = await worker.evaluate(async (id) => {
    const tab = await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Docs</title>' });
    return tab.id!;
  }, windowId);
  const home = (await bookmarkTree(worker)).children!.find((c) => c.title === 'Home')!;
  expect(home).toBeTruthy();
  const homeId = await worker.evaluate(async () => {
    const { root } = (await chrome.storage.local.get('root')) as { root: { rootId: string } };
    const children = await chrome.bookmarks.getChildren(root.rootId);
    return children.find((c) => c.title === 'Home')!.id;
  });
  await expect.poll(async () => (await stripState(worker, windowId)).find((t) => t.id === tabId)?.group).toBe('Home');
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
    return (await chrome.bookmarks.getChildren(root.rootId)).find((c) => c.title === 'Home')!.id;
  });
  await command(panel, { type: 'pinTab', windowId, tabId, parentId: homeId });

  const page = visiblePage(panel);
  const pinRow = page.getByRole('listitem').filter({ has: panel.getByRole('button', { name: 'Draft', exact: true }) });
  await pinRow.hover();
  await pinRow.getByRole('button', { name: 'Unpin' }).click();
  await expect.poll(async () => (await bookmarkTree(worker)).children!.find((c) => c.title === 'Home')!.children).toEqual([]);
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
  await expect.poll(() => worker.evaluate(async (id) => (await chrome.tabs.get(id)).title, tabId)).toBe('Spaces settings');
  const homeId = await worker.evaluate(async () => {
    const { root } = (await chrome.storage.local.get('root')) as { root: { rootId: string } };
    return (await chrome.bookmarks.getChildren(root.rootId)).find((c) => c.title === 'Home')!.id;
  });
  await command(panel, { type: 'pinTab', windowId, tabId, parentId: homeId });

  const page = visiblePage(panel);
  await expect(page.getByRole('button', { name: 'Spaces settings', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to the pinned page' })).toHaveCount(0); // not moved yet
  await worker.evaluate(async ({ id, url }) => chrome.tabs.update(id, { url }), { id: tabId, url: `${origin}/import.html` });
  const row = page.getByRole('listitem').filter({ has: panel.getByRole('button', { name: 'Import from Arc' }) });
  await expect(row).toContainText('/');
  await row.hover();
  await row.getByRole('button', { name: 'Back to the pinned page' }).click();
  await expect.poll(() => worker.evaluate(async (id) => (await chrome.tabs.get(id)).title, tabId)).toBe('Spaces settings');
  await expect(page.getByRole('button', { name: 'Back to the pinned page' })).toHaveCount(0);
});
