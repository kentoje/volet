import type { Page } from '@playwright/test';
import { command, expect, stripState, test } from './fixtures';

const visiblePage = (panel: Page) => panel.locator('section:not([inert])');
const row = (panel: Page, name: string) => visiblePage(panel).getByRole('button', { name, exact: true });
const tabTitle = (url: string) => url.match(/<title>(\w+)/)?.[1];

test('a collapsed folder still shows its open tabs', async ({ worker, windowId, panel }) => {
  const ids = await worker.evaluate(async (id) => {
    const titles = ['Alpha', 'Beta', 'Gamma'];
    return Promise.all(
      titles.map(async (title) => (await chrome.tabs.create({ windowId: id, url: `data:text/html,<title>${title}</title>` })).id!),
    );
  }, windowId);
  await expect(row(panel, 'Gamma')).toBeVisible();
  const home = await worker.evaluate(async () => {
    const { root } = (await chrome.storage.local.get('root')) as { root: { rootId: string } };
    return (await chrome.bookmarks.getChildren(root.rootId)).find((c) => c.title === 'Home')!.id;
  });
  const items = ids.map((id) => ({ kind: 'tab', id }));
  await command(panel, { type: 'createFolderWith', windowId, parentId: home, title: 'Dashboard', items });
  // Close Gamma's tab: its pin stays in the folder, unloaded.
  await worker.evaluate((id) => chrome.tabs.remove(id), ids[2]!);
  await expect.poll(async () => (await stripState(worker, windowId)).filter((tab) => tabTitle(tab.url)).length).toBe(2);
  await expect(row(panel, 'Gamma')).toBeVisible();

  // Count Alpha's rows on every frame while the folder collapses: it stays put, never copied.
  const most = panel.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let most = 0;
        const end = performance.now() + 400;
        const sample = () => {
          most = Math.max(most, document.querySelectorAll('section:not([inert]) button[title="Alpha"]').length);
          if (performance.now() < end) requestAnimationFrame(sample);
          else resolve(most);
        };
        sample();
      }),
  );
  await row(panel, 'Dashboard').click();
  await expect(row(panel, 'Dashboard')).toHaveAttribute('aria-expanded', 'false');
  expect(await most).toBe(1);
  // Only the pins with an open tab are left.
  await expect(row(panel, 'Gamma')).toHaveCount(0);
  await expect(row(panel, 'Alpha')).toBeVisible();
  await expect(row(panel, 'Beta')).toBeVisible();
});
