import path from 'node:path';
import type { BrowserContext } from '@playwright/test';
import { expect, extensionPath, stripState, test } from './fixtures';

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

/**
 * The palette the shortcut injects into a web page (the built `palette.js`), over a plain page whose root font
 * size is `rootFontSize`, answered by a fake worker. Returns every element's box and corners in its shadow root.
 */
async function paletteLayout(context: BrowserContext, rootFontSize?: string) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.setContent(`<!doctype html><html${rootFontSize ? ` style="font-size: ${rootFontSize}"` : ''}><body></body></html>`);
  await page.evaluate(() => {
    const items = [
      { id: 'space:1', kind: 'space', title: 'Switch to Work', hue: 152, ref: '1' },
      { id: 'action:new-tab', kind: 'action', title: 'New tab', ref: 'new-tab' },
      { id: 'tab:1', kind: 'tab', title: 'Quarterly plan', detail: 'Work · docs.example', url: 'https://docs.example/', ref: 1 },
    ];
    // WXT's `browser` is this object when it has a runtime id, so the palette talks to it instead of the worker.
    Object.assign(globalThis, {
      browser: { runtime: { id: 'test', sendMessage: async () => ({ ok: true, value: { hue: 268, items } }) } },
    });
  });
  await page.addScriptTag({ path: path.join(extensionPath, 'palette.js') });
  await expect(page.getByRole('option')).toHaveCount(3);
  const layout = await page.evaluate(() =>
    [...document.querySelector('spaces-palette')!.shadowRoot!.querySelectorAll('*')].map((node) => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { role: node.getAttribute('role'), x, y, width, height, corners: getComputedStyle(node).borderRadius };
    }),
  );
  await page.close();
  return layout;
}

test('the palette over a page keeps its size when the page changes the root font size', async ({ context }) => {
  // YouTube sets its root font size to 10px: rem-based sizes would shrink by a third.
  const usual = await paletteLayout(context);
  const small = await paletteLayout(context, '10px');
  expect(usual.filter((node) => node.role === 'option').map((node) => node.height)).toEqual([40, 40, 40]);
  expect(small).toEqual(usual);
});
