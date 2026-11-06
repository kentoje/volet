import { expect, stripState, test } from './fixtures';

test('the palette finds an open tab and switches to it', async ({ worker, windowId, panel }) => {
  await worker.evaluate(async (id) => {
    await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Quarterly plan</title>' });
    await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Elsewhere</title>' });
  }, windowId);
  await expect.poll(async () => (await stripState(worker, windowId)).find((tab) => tab.active)?.url).toContain('Elsewhere');
  await expect
    .poll(() => worker.evaluate(async () => (await chrome.tabs.query({})).some((tab) => tab.title === 'Quarterly plan')))
    .toBe(true);

  await panel.getByRole('button', { name: /^Search tabs and pins/ }).click();
  const input = panel.getByRole('combobox');
  await input.fill('quarterly');
  await expect(panel.getByRole('option').first()).toContainText('Quarterly plan');
  await input.press('Enter');

  await expect(panel.getByRole('combobox')).toHaveCount(0); // closed after running
  await expect.poll(async () => (await stripState(worker, windowId)).find((tab) => tab.active)?.url).toContain('Quarterly');
});

test('typing an address opens it in the active Space', async ({ context, worker, windowId, panel }) => {
  await context.route('https://docs.example/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Docs</title>' }),
  );
  await panel.getByRole('button', { name: /^Search tabs and pins/ }).click();
  const input = panel.getByRole('combobox');
  await input.fill('docs.example/start');
  await expect(panel.getByRole('option').first()).toContainText('Open https://docs.example/start');
  await input.press('Enter');
  await expect
    .poll(async () => (await stripState(worker, windowId)).find((tab) => tab.url.includes('docs.example'))?.group)
    .toBe('Volet 1 (click to rename)');
});

test('the shortcut on a page that cannot host it opens the palette in the panel', async ({ worker, windowId, panel }) => {
  // What the worker does when the shortcut fires on chrome:// pages, the Web Store, etc.
  await worker.evaluate(async (id) => chrome.storage.session.set({ pendingPalette: { [id]: true } }), windowId);
  await expect(panel.getByRole('combobox')).toBeVisible();
  await expect
    .poll(() => worker.evaluate(async () => (await chrome.storage.session.get('pendingPalette')).pendingPalette))
    .toEqual({});
});
