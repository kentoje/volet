import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { bookmarkTree, expect, extensionPath, test as base } from './fixtures';

// Playwright cannot answer Chrome's native optional-permission bubble. Give this isolated test build
// real host access up front; the production manifest continues to request it only when saving.
const test = base.extend({
  context: async ({}, use) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'volet-shortcut-test-'));
    const extension = path.join(directory, 'extension');
    await cp(extensionPath, extension, { recursive: true });
    const manifestFile = path.join(extension, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
    await writeFile(manifestFile, JSON.stringify({ ...manifest, host_permissions: manifest.optional_host_permissions }));
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium', headless: !process.env.HEADED,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    try {
      await use(context);
    } finally {
      await context.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
});

test('custom punctuation shortcuts pin with exact Shift state and stop when removed', async ({ context, worker }) => {
  const options = await context.newPage();
  await options.goto(`chrome-extension://${new URL(worker.url()).host}/options.html`);
  const recorder = options.getByRole('textbox', { name: 'Custom pin shortcut' });
  await expect(recorder).toBeEnabled();

  // Open the site before enabling the shortcut, exercising injection into existing tabs.
  await context.route('https://shortcut.example/**', (route) => route.fulfill({
    contentType: 'text/html', body: '<title>Shortcut test</title><input aria-label="Notes">' +
      (new URL(route.request().url()).pathname === '/' ? '<iframe src="/frame"></iframe>' : ''),
  }));
  const page = await context.newPage();
  await page.goto('https://shortcut.example/');
  await options.bringToFront();
  await recorder.focus();
  await recorder.press('Meta+Backslash');
  await expect(recorder).toHaveValue('Cmd+\\');
  await options.getByRole('button', { name: 'Save pin shortcut' }).click();
  await expect(options.getByRole('status')).toHaveText('Pin shortcut saved.');
  await expect.poll(() => worker.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).length)).toBe(1);

  const pinCount = async () => {
    const tree = await bookmarkTree(worker);
    return JSON.stringify(tree).split('https://shortcut.example/').length - 1;
  };
  await page.bringToFront();
  await page.getByRole('textbox', { name: 'Notes', exact: true }).focus();
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', {
    key: '\\', code: 'Backslash', metaKey: true, bubbles: true,
  })));
  await expect.poll(pinCount).toBe(0);
  await page.keyboard.press('Meta+Backslash');
  await expect.poll(pinCount).toBe(1);
  await page.keyboard.press('Meta+Shift+Backslash');
  // A mismatch stays a normal page event. A following match must still unpin.
  await expect.poll(pinCount).toBe(1);
  await page.keyboard.press('Meta+Backslash');
  await expect.poll(pinCount).toBe(0);

  // Shift records a pipe character on this physical key; the binding remains backslash + Shift.
  await options.bringToFront();
  await recorder.focus();
  await recorder.press('Meta+Shift+Backslash');
  await expect(recorder).toHaveValue('Cmd+Shift+\\');
  await options.getByRole('button', { name: 'Save pin shortcut' }).click();
  await expect(options.getByRole('status')).toHaveText('Pin shortcut saved.');
  await page.bringToFront();
  await page.reload(); // Dynamic registration handles subsequent navigations too.
  await page.getByRole('textbox', { name: 'Notes', exact: true }).focus();
  await page.keyboard.press('Meta+Backslash');
  await expect.poll(pinCount).toBe(0);
  await page.keyboard.press('Meta+Shift+Backslash');
  await expect.poll(pinCount).toBe(1);

  // A focused iframe still acts on its containing tab.
  await page.frameLocator('iframe').getByRole('textbox', { name: 'Notes' }).focus();
  await page.keyboard.press('Meta+Shift+Backslash');
  await expect.poll(pinCount).toBe(0);

  await options.bringToFront();
  await options.getByRole('button', { name: 'Remove custom shortcut' }).click();
  await expect(options.getByRole('status')).toHaveText('Custom pin shortcut removed.');
  await expect.poll(() => worker.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).length)).toBe(0);
  await page.bringToFront();
  await page.getByRole('textbox', { name: 'Notes', exact: true }).focus();
  await page.keyboard.press('Meta+Shift+Backslash');
  await expect.poll(pinCount).toBe(0);
});

base('saving a custom shortcut in storage alone grants no website access', async ({ worker }) => {
  await worker.evaluate(() => chrome.storage.local.set({ pinShortcut: {
    code: 'Backslash', key: '\\', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false,
  } }));
  expect(await worker.evaluate(() => chrome.permissions.contains({ origins: ['http://*/*', 'https://*/*'] }))).toBe(false);
  expect(await worker.evaluate(() => chrome.scripting.getRegisteredContentScripts())).toEqual([]);
});
