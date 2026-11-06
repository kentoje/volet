import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { command, expect, extensionPath, stripState, test } from './fixtures';

test('each window shows its own Space', async ({ context, worker, windowId, panel }) => {
  await panel.getByRole('button', { name: 'New Volet' }).click();
  await expect(panel.locator('section:not([inert])').getByRole('heading')).toHaveText('Volet 2');

  // A second window, with its own panel, stays on Home.
  const secondWindow = await worker.evaluate(async () => {
    const window = await chrome.windows.create({ url: 'data:text/html,<title>Second</title>' });
    return window!.id!;
  });
  const opened = context.waitForEvent('page', (page) => page.url().includes(`windowId=${secondWindow}`));
  await worker.evaluate(async (id) => {
    await chrome.windows.create({ url: `sidepanel.html?windowId=${id}`, type: 'popup', width: 360, height: 700 });
  }, secondWindow);
  const secondPanel = await opened;

  await expect(secondPanel.locator('section:not([inert])').getByRole('heading')).toHaveText(/Home|Volet 2/);
  await expect
    .poll(async () => (await stripState(worker, secondWindow)).every((tab) => tab.group !== null))
    .toBe(true);
  await secondPanel.getByRole('navigation', { name: 'Volets' }).getByRole('button', { name: 'Home' }).click();
  await expect(secondPanel.locator('section:not([inert])').getByRole('heading')).toHaveText('Home');

  // Switching the second window doesn't move the first one.
  await expect(panel.locator('section:not([inert])').getByRole('heading')).toHaveText('Volet 2');
  const active = await worker.evaluate(async () => (await chrome.storage.session.get('activeSpaces')).activeSpaces);
  expect(Object.keys(active as object)).toEqual(expect.arrayContaining([String(windowId), String(secondWindow)]));
});

test.describe('after a browser restart', () => {
  test('restored tabs find their pins and Spaces again', async () => {
    test.setTimeout(90_000);
    const profile = await mkdtemp(path.join(os.tmpdir(), 'spaces-restart-'));

    // First session: pin a tab.
    let context = await launch(profile);
    let worker = await serviceWorker(context);
    const windowId = await worker.evaluate(async () => (await chrome.windows.getAll({ windowTypes: ['normal'] }))[0]!.id!);
    const tabId = await worker.evaluate(
      async (id) => (await chrome.tabs.create({ windowId: id, url: 'data:text/html,<title>Survivor</title>' })).id!,
      windowId,
    );
    await expect.poll(() => worker.evaluate(async (id) => (await chrome.tabs.get(id)).title, tabId)).toBe('Survivor');
    await expect.poll(async () => (await stripState(worker, windowId)).find((t) => t.id === tabId)?.group).toBe('Home');
    const panel = await openPanel(context, worker, windowId);
    const homeId = await worker.evaluate(async () => {
      const { root } = (await chrome.storage.local.get('root')) as { root: { rootId: string } };
      return (await chrome.bookmarks.getChildren(root.rootId)).find((c) => c.title === 'Home')!.id;
    });
    await command(panel, { type: 'pinTab', windowId, tabId, parentId: homeId });
    await panel.close();
    await context.close();

    // "Continue where you left off", then start Chrome again on the same profile.
    const prefsPath = path.join(profile, 'Default', 'Preferences');
    const prefs = JSON.parse(await readFile(prefsPath, 'utf8'));
    await writeFile(prefsPath, JSON.stringify({ ...prefs, session: { ...prefs.session, restore_on_startup: 1 } }));
    context = await launch(profile, true);
    worker = await serviceWorker(context);

    // Restored tabs have new ids: the engine re-attaches them by URL and group title.
    await expect
      .poll(
        () =>
          worker.evaluate(async () => {
            const [tab] = (await chrome.tabs.query({})).filter((t) => t.title === 'Survivor');
            if (!tab) return 'not restored yet';
            const { bindings = {} } = (await chrome.storage.session.get('bindings')) as {
              bindings?: Record<string, { kind: string }>;
            };
            const group = tab.groupId > -1 ? (await chrome.tabGroups.get(tab.groupId)).title : undefined;
            return `${bindings[tab.id!]?.kind} in ${group}`;
          }),
        { timeout: 20_000 },
      )
      .toBe('pin in Home');
    await context.close();
  });
});

async function launch(profile: string, restore = false) {
  return chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: !process.env.HEADED,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      ...(restore ? ['--restore-last-session'] : []),
    ],
  });
}

async function serviceWorker(context: import('@playwright/test').BrowserContext) {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await expect.poll(() => worker.evaluate(async () => Boolean((await chrome.storage.local.get('root')).root))).toBe(true);
  return worker;
}

async function openPanel(context: import('@playwright/test').BrowserContext, worker: import('@playwright/test').Worker, windowId: number) {
  const opened = context.waitForEvent('page', (page) => page.url().includes('sidepanel.html'));
  await worker.evaluate(async (id) => {
    await chrome.windows.create({ url: `sidepanel.html?windowId=${id}`, type: 'popup', width: 360, height: 700 });
  }, windowId);
  const panel = await opened;
  await panel.waitForLoadState();
  return panel;
}
