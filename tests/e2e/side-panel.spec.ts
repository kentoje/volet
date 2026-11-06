import type { Page, Worker } from '@playwright/test';
import { expect, test } from './fixtures';

// The sidebar shortcut can't be pressed from Playwright (it's a browser-level gesture), and sidePanel.open needs one:
// a click on a button in an extension page opens the real side panel instead. The toggle itself is unit tested.

/** Open the real side panel of a window, from a click so Chrome sees a user gesture. */
async function openSidePanel(page: Page, windowId: number) {
  await page.evaluate((id) => {
    const button = document.createElement('button');
    button.id = 'open-side-panel';
    button.textContent = 'Open side panel';
    button.style.cssText = 'position:fixed;inset:0 auto auto 0;z-index:2147483647;width:120px;height:40px';
    button.onclick = () => {
      void chrome.sidePanel.open({ windowId: id });
      button.remove();
    };
    document.body.append(button);
  }, windowId);
  await page.click('#open-side-panel');
}

function openPanels(worker: Worker) {
  return worker.evaluate(async () => {
    const { openPanels } = (await chrome.storage.session.get('openPanels')) as { openPanels?: Record<string, true> };
    return Object.keys(openPanels ?? {}).map(Number);
  });
}

function sidePanelCount(worker: Worker) {
  return worker.evaluate(
    async () =>
      (await chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL' as chrome.runtime.ContextType] })).length,
  );
}

test('remembers which windows show the side panel', async ({ worker, panel, windowId }) => {
  await openSidePanel(panel, windowId);
  await expect.poll(() => sidePanelCount(worker)).toBe(1);
  await expect.poll(() => openPanels(worker)).toEqual([windowId]);

  await worker.evaluate((id) => chrome.sidePanel.close({ windowId: id }), windowId);
  await expect.poll(() => sidePanelCount(worker)).toBe(0);
  await expect.poll(() => openPanels(worker)).toEqual([]);
});

test('forgets the side panel of a closed window', async ({ worker, panel, windowId }) => {
  const other = await worker.evaluate(async () => (await chrome.windows.create({ url: 'about:blank' }))!.id!);
  await openSidePanel(panel, other);
  await expect.poll(() => openPanels(worker)).toEqual([other]);

  await worker.evaluate((id) => chrome.windows.remove(id), other);
  await expect.poll(() => openPanels(worker)).toEqual([]);
  expect(await openPanels(worker)).not.toContain(windowId);
});
